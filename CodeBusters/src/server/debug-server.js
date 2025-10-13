// Debug version of server.js with enhanced logging
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

console.log('🐛 Starting debug server...');

const app = express();
const PORT = process.env.PORT || 5002; // Use different port

console.log('🐛 Setting up middleware...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('🐛 Middleware setup complete');

// Simple test endpoint
app.get('/', (req, res) => {
    console.log('🐛 Root endpoint hit');
    res.json({ 
        message: 'Debug server is working!', 
        timestamp: new Date().toISOString()
    });
});

// Test registration endpoint without database
app.post('/api/register', (req, res) => {
    console.log('🐛 Registration endpoint hit with body:', req.body);
    
    const { username, password, role = 'rider' } = req.body;
    
    if (!username || !password) {
        console.log('🐛 Missing username or password');
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    console.log('🐛 Registration successful for:', username);
    res.json({
        success: true,
        message: 'User registered successfully',
        user: {
            id: Date.now(),
            username: username,
            role: role
        }
    });
});

// Test login endpoint without database  
app.post('/api/login', (req, res) => {
    console.log('🐛 Login endpoint hit with body:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('🐛 Missing username or password');
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    // Accept any login for testing
    console.log('🐛 Login successful for:', username);
    res.json({
        success: true,
        message: 'Login successful',
        user: {
            id: Date.now(),
            username: username,
            role: 'rider'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🐛 Debug server running on http://localhost:${PORT}`);
    console.log('🐛 Try testing with:');
    console.log(`🐛   curl http://localhost:${PORT}/`);
    console.log(`🐛   curl -X POST http://localhost:${PORT}/api/register -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'`);
});