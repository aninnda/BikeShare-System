const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all origins aka communicaion with frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bikes table for BMS (Bike Management System)
    db.run(`
        CREATE TABLE IF NOT EXISTS bikes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bike_id TEXT UNIQUE NOT NULL,
            model TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            location TEXT,
            battery_level INTEGER DEFAULT 100,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Rentals table
    db.run(`
        CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            bike_id INTEGER,
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            total_cost DECIMAL(10,2),
            status TEXT DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (bike_id) REFERENCES bikes (id)
        )
    `);

    console.log('Database tables initialized');
}

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'CodeBusters BMS API Server', 
        version: '1.0.0',
        endpoints: [
            'GET /api/bikes - Get all bikes',
            'GET /api/users - Get all users',
            'GET /api/rentals - Get all rentals'
        ]
    });
});

// API Routes

// Get all bikes
app.get('/api/bikes', (req, res) => {
    db.all('SELECT * FROM bikes', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ bikes: rows });
    });
});

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, email, created_at FROM users', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ users: rows });
    });
});

// Get all rentals
app.get('/api/rentals', (req, res) => {
    db.all(`
        SELECT r.*, u.username, b.bike_id, b.model 
        FROM rentals r 
        JOIN users u ON r.user_id = u.id 
        JOIN bikes b ON r.bike_id = b.id
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ rentals: rows });
    });
});

// Add a new bike
app.post('/api/bikes', (req, res) => {
    const { bike_id, model, location, battery_level } = req.body;
    
    db.run(
        'INSERT INTO bikes (bike_id, model, location, battery_level) VALUES (?, ?, ?, ?)',
        [bike_id, model, location, battery_level || 100],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                message: 'Bike added successfully',
                bike: { id: this.lastID, bike_id, model, location, battery_level }
            });
        }
    );
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend should be running on http://localhost:3000`);
});

// Graceful shutdown (forgot shutdown handling)
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});