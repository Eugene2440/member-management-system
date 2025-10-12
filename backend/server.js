const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const memberRoutes = require('./routes/members');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const announcementRoutes = require('./routes/announcements');
const leadershipRoutes = require('./routes/leadership');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://member-management-system-e52u.onrender.com', 'https://eugene2440.github.io']
        : ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/members', memberRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/leadership', leadershipRoutes);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/events.html'));
});

app.get('/leadership', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/leadership.html'));
});

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/join.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

app.get('/announcements', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/announcements.html'));
});

// Legacy routes for admin functionality
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Legacy registration route (redirect to join)
app.get('/register', (req, res) => {
    res.redirect('/join');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    
    // Handle specific error types
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'File too large. Please use a smaller image.' });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Something went wrong! Please try again.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AECAS Website available at: http://localhost:${PORT}`);
    console.log(`Pages available:`);
    console.log(`  - Home: http://localhost:${PORT}/home`);
    console.log(`  - Events: http://localhost:${PORT}/events`);
    console.log(`  - Leadership: http://localhost:${PORT}/leadership`);
    console.log(`  - Contact: http://localhost:${PORT}/contact`);
    console.log(`  - Join AECAS: http://localhost:${PORT}/join`);
    console.log(`  - Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`Build timestamp: ${new Date().toISOString()}`);
    console.log(`Ready for deployment! 🚀`);
});
