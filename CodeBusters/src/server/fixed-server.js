const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

console.log('🔧 Starting fixed server...');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced error handling
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware with error handling
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Body:', JSON.stringify(req.body));
    }
    next();
});

// Database setup with better error handling
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🗃️ Database path:', dbPath);

let db;
try {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        } else {
            console.log('✅ Connected to SQLite database');
            initializeDatabase();
        }
    });
} catch (error) {
    console.error('❌ Failed to create database connection:', error);
    process.exit(1);
}

// Initialize database tables
function initializeDatabase() {
    console.log('🏗️ Initializing database tables...');
    
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'rider',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating users table:', err.message);
        } else {
            console.log('✅ Users table created successfully');
        }
    });
    
    console.log('✅ Database initialization complete');
}

// Basic test endpoint
app.get('/', (req, res) => {
    console.log('🏠 Root endpoint accessed');
    res.json({ 
        message: 'Fixed CodeBusters BMS API Server', 
        version: '1.0.1',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('🏥 Health check accessed');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
});

// Registration endpoint with enhanced logging and error handling
app.post('/api/register', (req, res) => {
    console.log('📝 Registration attempt started');
    console.log('📝 Request body:', req.body);
    
    const { username, password, role = 'rider' } = req.body;
    
    // Validation
    if (!username || !password) {
        console.log('❌ Registration failed: Missing credentials');
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    if (!db) {
        console.log('❌ Registration failed: Database not available');
        return res.status(500).json({
            success: false,
            message: 'Database connection not available'
        });
    }
    
    console.log('📝 Attempting to insert user:', username, 'with role:', role);
    
    // Insert new user into database
    db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, password, role],
        function(err) {
            if (err) {
                console.error('❌ Database error during registration:', err.message);
                
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log('❌ Registration failed: Username already exists');
                    return res.status(409).json({ 
                        success: false, 
                        message: 'Username already exists' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error during registration',
                    error: err.message
                });
            }
            
            const newUser = {
                id: this.lastID,
                username: username,
                role: role
            };
            
            console.log('✅ Registration successful:', newUser);
            
            res.json({
                success: true,
                message: 'User registered successfully',
                user: newUser
            });
        }
    );
});

// Login endpoint with enhanced logging and error handling
app.post('/api/login', (req, res) => {
    console.log('🔐 Login attempt started');
    console.log('🔐 Request body:', req.body);
    
    const { username, password } = req.body;
    
    // Validation
    if (!username || !password) {
        console.log('❌ Login failed: Missing credentials');
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    if (!db) {
        console.log('❌ Login failed: Database not available');
        return res.status(500).json({
            success: false,
            message: 'Database connection not available'
        });
    }
    
    console.log('🔐 Querying database for user:', username);
    
    // Query database for user
    db.get(
        'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, row) => {
            if (err) {
                console.error('❌ Database error during login:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error during login',
                    error: err.message
                });
            }
            
            if (row) {
                console.log('✅ Login successful for user:', row);
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: {
                        id: row.id,
                        username: row.username,
                        role: row.role
                    }
                });
            } else {
                console.log('❌ Login failed: Invalid credentials for user:', username);
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }
        }
    );
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('💥 Express error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
    });
});

// Start server with enhanced error handling
const server = app.listen(PORT, (err) => {
    if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
    
    console.log('🚀 Fixed server running on http://localhost:' + PORT);
    console.log('📱 Frontend should connect to http://localhost:3000');
    console.log('🔧 Enhanced logging and error handling enabled');
    console.log('📡 Available endpoints:');
    console.log('   GET  / - Server info');
    console.log('   GET  /health - Health check');  
    console.log('   POST /api/register - User registration');
    console.log('   POST /api/login - User login');
});

server.on('error', (error) => {
    console.error('💥 Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the process or use a different port.`);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down server gracefully...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('✅ Database connection closed');
            }
        });
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});