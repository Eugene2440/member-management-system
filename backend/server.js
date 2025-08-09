const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const memberRoutes = require('./routes/members');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourusername.github.io'] // Replace with your actual GitHub Pages URL
        : ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/members', memberRoutes);
app.use('/api/auth', authRoutes);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`Admin dashboard at: http://localhost:${PORT}/admin`);
});
