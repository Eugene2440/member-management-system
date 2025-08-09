const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { collection, query, where, getDocs } = require('firebase/firestore');
const { db } = require('../config/firebase');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Query for user in admins collection
        const q = query(collection(db, 'admins'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, userData.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: userDoc.id, 
                username: userData.username, 
                role: userData.role,
                name: userData.name 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: userDoc.id,
                username: userData.username,
                name: userData.name,
                role: userData.role
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token route
router.post('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
