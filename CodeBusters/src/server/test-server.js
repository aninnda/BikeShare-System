// Simple test to check if server is working
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ success: true, message: 'Server is working!' });
});

// Test registration endpoint
app.post('/api/register', (req, res) => {
    console.log('Registration attempt:', req.body);
    res.json({ 
        success: true, 
        message: 'Registration test successful',
        user: { 
            id: 1, 
            username: req.body.username, 
            role: req.body.role || 'rider' 
        }
    });
});

// Test login endpoint
app.post('/api/login', (req, res) => {
    console.log('Login attempt:', req.body);
    res.json({ 
        success: true, 
        message: 'Login test successful',
        user: { 
            id: 1, 
            username: req.body.username, 
            role: 'rider' 
        }
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
});