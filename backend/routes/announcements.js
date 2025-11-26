const express = require('express');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public routes - No authentication required
router.get('/public', async (req, res) => {
    try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const announcements = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.active !== false) { // Only show active announcements
                announcements.push({ id: doc.id, ...data });
            }
        });
        
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error fetching public announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Protected routes - Require authentication
router.use(verifyToken);

// Get all announcements (communications and admin only)
router.get('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const announcements = [];
        
        querySnapshot.forEach((doc) => {
            announcements.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Create announcement (communications and admin only)
router.post('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { title, content, priority, expiryDate } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const announcementData = {
            title: title.trim(),
            content: content.trim(),
            priority: priority || 'normal',
            expiryDate: expiryDate || null,
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            active: true
        };
        
        const docRef = await addDoc(collection(db, 'announcements'), announcementData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Announcement created successfully',
            announcementId: docRef.id
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// Update announcement (communications and admin only)
router.put('/:id', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        updateData.lastUpdated = new Date().toISOString();
        updateData.updatedBy = req.user.username;
        
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.createdBy;
        
        const announcementRef = doc(db, 'announcements', id);
        await updateDoc(announcementRef, updateData);
        
        res.json({ success: true, message: 'Announcement updated successfully' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

// Delete announcement (admin only)
router.delete('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const announcementRef = doc(db, 'announcements', id);
        await deleteDoc(announcementRef);
        
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

module.exports = router;