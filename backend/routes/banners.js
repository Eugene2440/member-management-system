const express = require('express');
const { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, query, increment } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper function to check if a banner is currently active based on date range
 * @param {Object} banner - Banner object with startDate and endDate
 * @returns {boolean} - True if banner is within active date range
 */
function isWithinDateRange(banner) {
    const now = new Date();
    
    // Check start date - if set, current time must be >= start date
    if (banner.startDate) {
        const startDate = new Date(banner.startDate);
        if (now < startDate) {
            return false;
        }
    }
    
    // Check end date - if set, current time must be <= end date
    if (banner.endDate) {
        const endDate = new Date(banner.endDate);
        if (now > endDate) {
            return false;
        }
    }
    
    return true;
}

/**
 * Helper function to filter and sort active banners
 * @param {Array} banners - Array of banner objects
 * @returns {Array} - Filtered and sorted banners
 */
function filterActiveBanners(banners) {
    return banners
        .filter(banner => banner.active === true && isWithinDateRange(banner))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

/**
 * GET /api/banners/active
 * Public endpoint to get active banners for display
 * Returns only banners that are:
 * - active: true
 * - within their scheduled date range
 * - ordered by createdAt descending (newest first)
 */
router.get('/active', async (req, res) => {
    try {
        const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const allBanners = [];
        
        querySnapshot.forEach((doc) => {
            allBanners.push({ id: doc.id, ...doc.data() });
        });
        
        // Filter for active banners within date range
        const activeBanners = filterActiveBanners(allBanners);
        
        res.json({ success: true, banners: activeBanners });
    } catch (error) {
        console.error('Error fetching active banners:', error);
        res.status(500).json({ error: 'Failed to fetch active banners' });
    }
});

/**
 * POST /api/banners/track
 * Public endpoint to track banner impressions and clicks
 * Request body: { bannerId: string, eventType: "impression" | "click" }
 * Increments the corresponding counter in Firebase
 */
router.post('/track', async (req, res) => {
    try {
        const { bannerId, eventType } = req.body;
        
        // Validate required fields
        if (!bannerId) {
            return res.status(400).json({ error: 'Banner ID is required' });
        }
        
        if (!eventType || !['impression', 'click'].includes(eventType)) {
            return res.status(400).json({ error: 'Event type must be "impression" or "click"' });
        }
        
        // Check if banner exists
        const bannerRef = doc(db, 'banners', bannerId);
        const bannerSnap = await getDoc(bannerRef);
        
        if (!bannerSnap.exists()) {
            return res.status(404).json({ error: 'Banner not found' });
        }
        
        // Determine which counter to increment
        const counterField = eventType === 'impression' ? 'impressions' : 'clicks';
        
        // Increment the counter atomically
        await updateDoc(bannerRef, {
            [counterField]: increment(1)
        });
        
        res.json({ success: true, message: `${eventType} tracked successfully` });
    } catch (error) {
        console.error('Error tracking banner event:', error);
        res.status(500).json({ error: 'Failed to track banner event' });
    }
});

// ============================================
// PROTECTED ROUTES - Require authentication
// ============================================

// Apply authentication middleware to all routes below
router.use(verifyToken);

/**
 * GET /api/banners
 * Admin endpoint to get all banners
 * Returns all banners ordered by createdAt descending
 * Requires: communications or admin role
 */
router.get('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const banners = [];
        
        querySnapshot.forEach((doc) => {
            banners.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, banners });
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

/**
 * POST /api/banners
 * Create a new banner
 * Required fields: title, redirectUrl
 * Optional fields: description, imageUrl, startDate, endDate, displayDuration, displayFrequency, active
 * Requires: communications or admin role
 */
router.post('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { 
            title, 
            description, 
            imageUrl, 
            redirectUrl, 
            startDate, 
            endDate, 
            displayDuration, 
            displayFrequency,
            active 
        } = req.body;
        
        // Validate required fields
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        if (!redirectUrl || !redirectUrl.trim()) {
            return res.status(400).json({ error: 'Redirect URL is required' });
        }
        
        // Build banner data with defaults
        const bannerData = {
            title: title.trim(),
            description: description?.trim() || '',
            imageUrl: imageUrl?.trim() || '',
            redirectUrl: redirectUrl.trim(),
            startDate: startDate || null,
            endDate: endDate || null,
            displayDuration: displayDuration || 10, // Default: 10 seconds
            displayFrequency: displayFrequency || 'once_per_session', // Default: once per session
            active: active !== undefined ? active : true, // Default: active
            impressions: 0,
            clicks: 0,
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            updatedAt: null,
            updatedBy: null
        };
        
        const docRef = await addDoc(collection(db, 'banners'), bannerData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Banner created successfully',
            bannerId: docRef.id
        });
    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({ error: 'Failed to create banner' });
    }
});

/**
 * PUT /api/banners/:id
 * Update an existing banner
 * Requires: communications or admin role
 */
router.put('/:id', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Check if banner exists
        const bannerRef = doc(db, 'banners', id);
        const bannerSnap = await getDoc(bannerRef);
        
        if (!bannerSnap.exists()) {
            return res.status(404).json({ error: 'Banner not found' });
        }
        
        // Validate title if provided
        if (updateData.title !== undefined && (!updateData.title || !updateData.title.trim())) {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }
        
        // Validate redirectUrl if provided
        if (updateData.redirectUrl !== undefined && (!updateData.redirectUrl || !updateData.redirectUrl.trim())) {
            return res.status(400).json({ error: 'Redirect URL cannot be empty' });
        }
        
        // Trim string fields if provided
        if (updateData.title) updateData.title = updateData.title.trim();
        if (updateData.description) updateData.description = updateData.description.trim();
        if (updateData.imageUrl) updateData.imageUrl = updateData.imageUrl.trim();
        if (updateData.redirectUrl) updateData.redirectUrl = updateData.redirectUrl.trim();
        
        // Set update metadata
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = req.user.username;
        
        // Remove fields that shouldn't be updated
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.createdBy;
        
        await updateDoc(bannerRef, updateData);
        
        res.json({ success: true, message: 'Banner updated successfully' });
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ error: 'Failed to update banner' });
    }
});

/**
 * DELETE /api/banners/:id
 * Delete a banner
 * Requires: communications or admin role
 */
router.delete('/:id', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if banner exists
        const bannerRef = doc(db, 'banners', id);
        const bannerSnap = await getDoc(bannerRef);
        
        if (!bannerSnap.exists()) {
            return res.status(404).json({ error: 'Banner not found' });
        }
        
        await deleteDoc(bannerRef);
        
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ error: 'Failed to delete banner' });
    }
});

module.exports = router;
