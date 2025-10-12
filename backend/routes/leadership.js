const express = require('express');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Get all leaders
router.get('/public', async (req, res) => {
    try {
        const leadersRef = collection(db, 'leadership');
        const q = query(leadersRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const leaders = [];
        
        querySnapshot.forEach((doc) => {
            leaders.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, leaders });
    } catch (error) {
        console.error('Error fetching leaders:', error);
        res.status(500).json({ error: 'Failed to fetch leaders' });
    }
});

// Protected routes
router.use(verifyToken);

// Get all leaders (admin only)
router.get('/', verifyRole(['admin']), async (req, res) => {
    try {
        const q = query(collection(db, 'leadership'), orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const leaders = [];
        
        querySnapshot.forEach((doc) => {
            leaders.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, leaders });
    } catch (error) {
        console.error('Error fetching leaders:', error);
        res.status(500).json({ error: 'Failed to fetch leaders' });
    }
});

// Add/Update leader (admin only)
router.post('/', verifyRole(['admin']), async (req, res) => {
    try {
        const { position, name, description, photo, order } = req.body;
        
        if (!position || !name) {
            return res.status(400).json({ error: 'Position and name are required' });
        }
        
        const leaderData = {
            position: position.trim(),
            name: name.trim(),
            description: description ? description.trim() : '',
            photo: photo || null,
            order: order || 0,
            lastUpdated: new Date().toISOString()
        };
        
        const docRef = await addDoc(collection(db, 'leadership'), leaderData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Leader added successfully',
            leaderId: docRef.id
        });
    } catch (error) {
        console.error('Error adding leader:', error);
        res.status(500).json({ error: 'Failed to add leader' });
    }
});

// Update leader (admin only)
router.put('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        updateData.lastUpdated = new Date().toISOString();
        delete updateData.id;
        
        const leaderRef = doc(db, 'leadership', id);
        await updateDoc(leaderRef, updateData);
        
        res.json({ success: true, message: 'Leader updated successfully' });
    } catch (error) {
        console.error('Error updating leader:', error);
        res.status(500).json({ error: 'Failed to update leader' });
    }
});

// Delete leader (admin only)
router.delete('/:id', verifyRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const leaderRef = doc(db, 'leadership', id);
        await deleteDoc(leaderRef);
        
        res.json({ success: true, message: 'Leader deleted successfully' });
    } catch (error) {
        console.error('Error deleting leader:', error);
        res.status(500).json({ error: 'Failed to delete leader' });
    }
});

module.exports = router;
