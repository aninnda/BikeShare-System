// ...existing code...

// (Place this route after all initialization and middleware, with the other app.get routes)

// Notifications: Get empty/full docking station notifications for user profile
// This must be after app, bmsManager, and all middleware are initialized

// ...existing code...

// (Insert here, after all other app.get/app.post routes, but before app.listen)

app.get('/api/notifications/stations', (req, res) => {
    try {
        const stations = bmsManager.listAllStations();
        const notifications = [];

        stations.forEach(station => {
            if (station.isEmpty) {
                notifications.push({
                    type: 'station_empty',
                    stationId: station.id,
                    stationName: station.name,
                    message: `Docking station "${station.name}" is currently empty. No bikes available.`,
                    timestamp: new Date().toISOString(),
                });
            }
            if (station.isFull) {
                notifications.push({
                    type: 'station_full',
                    stationId: station.id,
                    stationName: station.name,
                    message: `Docking station "${station.name}" is currently full. No docks available.`,
                    timestamp: new Date().toISOString(),
                });
            }
        });

        res.json({
            success: true,
            notifications,
            total: notifications.length
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving station notifications',
            error: error.message
        });
    }
});
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import BMS components for R-BMS-02 implementation
const BMSManager = require('./src/bms/BMSManager');
const { BMS_OPERATIONS, HTTP_STATUS } = require('./config/constants');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize BMS Manager for R-BMS-02 compliance
const bmsManager = new BMSManager();

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
    // Drop existing users table to reset it
    //Uncomment the below lines if you want to reset the users table on server restart
    
    // db.run(`DROP TABLE IF EXISTS users`, (err) => {
    //     if (err) {
    //         console.error('Error dropping users table:', err.message);
    //     } else {
    //         console.log('Existing users table dropped');
    //     }
    // });

    // Users table - simplified with only username and password
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
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created successfully');
        }
    });

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

    // // Insert a default operator user for testing
    // db.run(`
    //     INSERT INTO users (username, password, role) VALUES ('ops', 'baba', 'operator')
    // `);

    console.log('Database tables initialized');
    
    // Initialize stations and bikes from config
    initializeStationsFromConfig();
}

// Initialize BMS demo data for R-BMS-02 testing

// Load all stations and bikes from stations-config.json at startup
const fs = require('fs');
const Station = require('./src/bms/Station');
const Bike = require('./src/bms/Bike');

function initializeStationsFromConfig() {
    const configPath = path.join(__dirname, 'config', 'stations-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    if (!config.stations) {
        console.error('No stations found in config!');
        return;
    }
    bmsManager.stations.clear();
    bmsManager.bikes.clear();
    for (const stationObj of config.stations) {
        // Create Station instance
        const station = new Station(
            stationObj.id,
            stationObj.capacity,
            {
                name: stationObj.name,
                status: stationObj.status === 'out_of_service' ? 'out_of_service' : 'active',
                latitude: stationObj.latitude,
                longitude: stationObj.longitude,
                address: stationObj.address,
                reservationHoldTimeMinutes: stationObj.reservationHoldTimeMinutes
            }
        );
        // Add bikes to station
        for (const bikeObj of stationObj.bikes) {
            const bike = new Bike(bikeObj.id, bikeObj.type);
            bike.status = bikeObj.status;
            station.dockedBikes.set(bike.id, bike);
            bmsManager.bikes.set(bike.id, bike);
        }
        bmsManager.stations.set(station.id, station);
    }
    console.log(`Loaded ${bmsManager.stations.size} stations and ${bmsManager.bikes.size} bikes from config.`);
}

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'CodeBusters BMS API Server with R-BMS-02 Implementation', 
        version: '1.0.0',
        r_bms_02: 'Prevents undocking from empty stations and docking to full stations',
        endpoints: [
            'GET /api/bikes - Get all bikes',
            'GET /api/users - Get all users',
            'GET /api/rentals - Get all rentals',
            'GET /api/stations - Get all stations (R-BMS-02)',
            'GET /api/stations/:id - Get specific station info',
            'POST /api/stations - Create new station',
            'POST /api/rent - Rent a bike (R-BMS-02 protected)',
            'POST /api/return - Return a bike (R-BMS-02 protected)',
            'GET /api/bms/overview - System overview with R-BMS-02 stats'
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
    db.all('SELECT id, username, role, created_at FROM users', (err, rows) => {
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

// Registration endpoint
app.post('/api/register', (req, res) => {
    const { username, password, role = 'rider' } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    // Insert new user into database
    db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, password, role],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ 
                        success: false, 
                        message: 'Username already exists' 
                    });
                }
                console.error('Database error:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error 1' 
                });
            }
            
            res.json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: this.lastID,
                    username: username,
                    role: role
                }
            });
        }
    );
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }
    
    // Query database for user with matching username and password
    db.get(
        'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, row) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error 2' 
                });
            }
            
            if (row) {
                // User found - login successful
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
                // User not found or password incorrect
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }
        }
    );
});

// Temporary endpoint for successful login redirect
app.get('/api/temporary', (req, res) => {
    res.json({
        message: 'Welcome! You have successfully logged in.',
        timestamp: new Date().toISOString(),
        status: 'authenticated'
    });
});

// ============= R-BMS-02 IMPLEMENTATION ENDPOINTS =============

// Get all stations with R-BMS-02 compliance info
app.get('/api/stations', (req, res) => {
    try {
        const stations = bmsManager.listAllStations();
        res.json({
            success: true,
            r_bms_02_compliance: 'Active - prevents empty/full station operations',
            stations: stations,
            totalStations: stations.length
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving stations',
            error: error.message
        });
    }
});

// Get specific station information
app.get('/api/stations/:id', (req, res) => {
    try {
        const stationInfo = bmsManager.getStationInfo(req.params.id);
        if (stationInfo.success) {
            res.json(stationInfo);
        } else {
            res.status(HTTP_STATUS.NOT_FOUND).json(stationInfo);
        }
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving station information',
            error: error.message
        });
    }
});

// Create new station
app.post('/api/stations', (req, res) => {
    try {
        const { stationId, capacity, location } = req.body;
        
        if (!stationId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Station ID is required'
            });
        }
        
        const result = bmsManager.addStation(stationId, capacity, location);
        const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.CONFLICT;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error creating station',
            error: error.message
        });
    }
});

// R-BMS-02: Rent a bike (undock with empty station prevention)
app.post('/api/rent', (req, res) => {
    try {
        const { userId, stationId, bikeId } = req.body;
        
        if (!userId || !stationId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'User ID and Station ID are required'
            });
        }
        
        const result = bmsManager.rentBike(userId, stationId, bikeId);
        
        // R-BMS-02 specific status codes
        let statusCode = HTTP_STATUS.OK;
        if (!result.success) {
            if (result.operation === BMS_OPERATIONS.UNDOCK_FAILED_EMPTY) {
                statusCode = HTTP_STATUS.CONFLICT; // 409 for R-BMS-02 violation
            } else {
                statusCode = HTTP_STATUS.BAD_REQUEST;
            }
        }
        
        res.status(statusCode).json({
            ...result,
            r_bms_02_protected: result.operation === BMS_OPERATIONS.UNDOCK_FAILED_EMPTY ? 
                'Blocked: Cannot undock from empty station' : 'Operation allowed'
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error processing bike rental',
            error: error.message
        });
    }
});

// R-BMS-02: Return a bike (dock with full station prevention)
app.post('/api/return', (req, res) => {
    try {
        const { userId, bikeId, stationId } = req.body;
        
        if (!userId || !bikeId || !stationId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'User ID, Bike ID, and Station ID are required'
            });
        }
        
        const result = bmsManager.returnBike(userId, bikeId, stationId);
        
        // R-BMS-02 specific status codes
        let statusCode = HTTP_STATUS.OK;
        if (!result.success) {
            if (result.operation === BMS_OPERATIONS.DOCK_FAILED_FULL) {
                statusCode = HTTP_STATUS.CONFLICT; // 409 for R-BMS-02 violation
            } else {
                statusCode = HTTP_STATUS.BAD_REQUEST;
            }
        }
        
        res.status(statusCode).json({
            ...result,
            r_bms_02_protected: result.operation === BMS_OPERATIONS.DOCK_FAILED_FULL ? 
                'Blocked: Cannot dock to full station' : 'Operation allowed'
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error processing bike return',
            error: error.message
        });
    }
});

// Get BMS system overview with R-BMS-02 statistics
app.get('/api/bms/overview', (req, res) => {
    try {
        const overview = bmsManager.getSystemOverview();
        res.json({
            success: true,
            message: 'BMS System Overview with R-BMS-02 Compliance',
            ...overview
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error retrieving system overview',
            error: error.message
        });
    }
});

// Set station maintenance mode
app.post('/api/stations/:id/maintenance', (req, res) => {
    try {
        const result = bmsManager.setStationMaintenance(req.params.id);
        const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.NOT_FOUND;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error setting station maintenance',
            error: error.message
        });
    }
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