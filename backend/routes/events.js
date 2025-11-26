const express = require('express');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public routes - No authentication required
router.get('/public', async (req, res) => {
    try {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const events = [];
        
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, events });
    } catch (error) {
        console.error('Error fetching public events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

router.get('/past/public', async (req, res) => {
    try {
        const now = new Date().toISOString().split('T')[0];
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const events = [];
        
        querySnapshot.forEach((doc) => {
            const eventData = { id: doc.id, ...doc.data() };
            if (eventData.date < now) {
                events.push(eventData);
            }
        });
        
        res.json({ success: true, events });
    } catch (error) {
        console.error('Error fetching past events:', error);
        res.status(500).json({ error: 'Failed to fetch past events' });
    }
});

// Protected routes - Require authentication
router.use(verifyToken);

// Get all events (communications and admin only)
router.get('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const events = [];
        
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Create event (communications and admin only)
router.post('/', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { title, description, date, location, type } = req.body;
        
        if (!title || !description || !date) {
            return res.status(400).json({ error: 'Title, description, and date are required' });
        }
        
        const eventData = {
            title: title.trim(),
            description: description.trim(),
            date,
            location: location?.trim() || '',
            type: type || 'general',
            createdAt: new Date().toISOString(),
            createdBy: req.user.username
        };
        
        const docRef = await addDoc(collection(db, 'events'), eventData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Event created successfully',
            eventId: docRef.id
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Update event (communications and admin only)
router.put('/:id', verifyRole(['communications', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        updateData.lastUpdated = new Date().toISOString();
        updateData.updatedBy = req.user.username;
        
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.createdBy;
        
        const eventRef = doc(db, 'events', id);
        await updateDoc(eventRef, updateData);
        
        res.json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Delete event (admin only)
router.delete('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const eventRef = doc(db, 'events', id);
        await deleteDoc(eventRef);
        
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;