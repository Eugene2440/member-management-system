const express = require('express');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Get active announcements
router.get('/public', async (req, res) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'announcements'));
        const announcements = [];
        
        querySnapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            if (data.isActive) {
                announcements.push(data);
            }
        });
        
        announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.json({ success: true, announcements: [] });
    }
});

// Protected routes
router.use(verifyToken);

// Get all announcements (admin only)
router.get('/', verifyRole(['admin']), async (req, res) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'announcements'));
        const announcements = [];
        
        querySnapshot.forEach((doc) => {
            announcements.push({ id: doc.id, ...doc.data() });
        });
        
        announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.json({ success: true, announcements: [] });
    }
});

// Create announcement (admin only)
router.post('/', verifyRole(['admin']), async (req, res) => {
    try {
        const { title, message, priority } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }
        
        const announcementData = {
            title: title.trim(),
            message: message.trim(),
            priority: priority || 'normal',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
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

// Update announcement (admin only)
router.put('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        updateData.lastUpdated = new Date().toISOString();
        delete updateData.id;
        delete updateData.createdAt;
        
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
