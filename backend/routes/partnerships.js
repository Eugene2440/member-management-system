const express = require('express');
const { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } = require('firebase/firestore');
const { db } = require('../config/firebase');
const { verifyToken, verifyRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Get all partnerships
router.get('/', async (req, res) => {
    try {
        const q = query(collection(db, 'partnerships'), orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const partnerships = [];
        
        querySnapshot.forEach((doc) => {
            partnerships.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, partnerships });
    } catch (error) {
        console.error('Error fetching partnerships:', error);
        res.status(500).json({ error: 'Failed to fetch partnerships' });
    }
});

// Protected routes
router.use(verifyToken);
router.use(verifyRole(['admin']));

// Create partnership
router.post('/', async (req, res) => {
    try {
        const { name, description, link, email, phone, photo, order } = req.body;
        
        const partnershipData = {
            name: name.trim(),
            description: description ? description.trim() : null,
            link: link ? link.trim() : null,
            email: email ? email.trim() : null,
            phone: phone ? phone.trim() : null,
            photo: photo || null,
            order: order || 0,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await addDoc(collection(db, 'partnerships'), partnershipData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Partnership created successfully',
            id: docRef.id
        });
    } catch (error) {
        console.error('Error creating partnership:', error);
        res.status(500).json({ error: 'Failed to create partnership' });
    }
});

// Update partnership
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        delete updateData.id;
        delete updateData.createdAt;
        
        const partnershipRef = doc(db, 'partnerships', id);
        await updateDoc(partnershipRef, updateData);
        
        res.json({ success: true, message: 'Partnership updated successfully' });
    } catch (error) {
        console.error('Error updating partnership:', error);
        res.status(500).json({ error: 'Failed to update partnership' });
    }
});

// Delete partnership
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const partnershipRef = doc(db, 'partnerships', id);
        await deleteDoc(partnershipRef);
        
        res.json({ success: true, message: 'Partnership deleted successfully' });
    } catch (error) {
        console.error('Error deleting partnership:', error);
        res.status(500).json({ error: 'Failed to delete partnership' });
    }
});

module.exports = router;
