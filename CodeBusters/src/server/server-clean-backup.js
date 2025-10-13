/**
 * @file server-clean.js
 * @description
 * This file serves as the main entry point for the CodeBusters Bike Management System (BMS) API server.
 * It provides a clean and organized Express server setup, focusing on modularity and maintainability.
 * The server initializes the database connection, sets up core services for bike management and reservations,
 * configures RESTful API routes for bikes, users, rentals, and authentication, and manages background tasks
 * such as automatic expiration of old reservations. Graceful shutdown and health check endpoints are also included.
 *
 * @module server-clean
 *
 * @function initializeApp
 * Initializes the application by connecting to the database, instantiating core services, setting up routes,
 * and starting background tasks. Handles errors during initialization and exits the process if setup fails.
 *
 * @function setupRoutes
 * Configures all API endpoints, including bike and user management, rental history, reservation actions,
 * authentication (register/login), and health checks. Integrates modular route handlers for reservations.
 *
 * @function setupBackgroundTasks
 * Sets up periodic background jobs, such as expiring old reservations every minute, to maintain data integrity.
 *
 * @function startServer
 * Starts the Express server after successful initialization, listening on the configured port.
 *
 * @event SIGINT
 * Handles graceful shutdown of the server, ensuring the database connection is properly closed before exit.
 */


const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Import our organized modules
const Database = require('./config/database');
const BMSService = require('./services/bmsService');
const ReservationService = require('./services/reservationService');
const createReservationRoutes = require('./routes/reservations');

// Import BMS components for R-BMS-02 implementation
const BMSManager = require('./src/bms/BMSManager');
const ConfigDatabaseService = require('./src/services/configDatabaseService');

// Import authentication middleware
const { 
    authenticateUser, 
    requireRole, 
    requireRider, 
    requireOperator, 
    requireRiderOrOperator,
    requireOwnershipOrOperator 
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global variables for services
let db, bmsService, reservationService, bmsManager, configDatabaseService;

// Initialize application
async function initializeApp() {
    try {
        // Initialize database
        const database = new Database();
        db = await database.connect();
        
        // Initialize services
        bmsService = new BMSService(db);
        reservationService = new ReservationService(db, bmsService);
        
        // Initialize BMS Manager for R-BMS-02 compliance
        bmsManager = new BMSManager();
        
        // R-BMS-01: Initialize Configuration Database Service
        configDatabaseService = new ConfigDatabaseService(db);
        
        // R-BMS-01: Load system from configuration file
        await initializeFromConfig();
        
        // Initialize demo stations and bikes for R-BMS-02 testing
        initializeBMSDemo();
        
        // Setup routes
        setupRoutes();
        
        // Setup background tasks
        setupBackgroundTasks();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// R-BMS-01: Initialize system from configuration file
async function initializeFromConfig() {
    try {
        console.log('🚀 R-BMS-01: Initializing system from configuration file...');
        
        const summary = await configDatabaseService.initializeFromConfig();
        
        console.log('✅ R-BMS-01: System initialized from configuration');
        console.log(`📊 Loaded ${summary.totalStations} stations and ${summary.totalBikes} bikes`);
        
        return summary;
    } catch (error) {
        console.error('❌ R-BMS-01: Failed to initialize from config:', error.message);
        // Continue without config - fallback to demo data
        console.log('⚠️  Falling back to demo data initialization');
    }
}

// Initialize BMS demo data for R-BMS-02 testing
function initializeBMSDemo() {
    console.log('Initializing BMS demo data for R-BMS-02...');
    
    // Create demo stations
    bmsManager.addStation('STN001', 5, 'Concordia University - Main Campus');
    bmsManager.addStation('STN002', 3, 'Metro Station Downtown');
    bmsManager.addStation('STN003', 8, 'Park Avenue Station');
    
    // Add demo bikes to stations
    bmsManager.addBike('BIKE001', 'STN001', 'standard');
    bmsManager.addBike('BIKE002', 'STN001', 'e-bike');
    bmsManager.addBike('BIKE003', 'STN002', 'standard');
    bmsManager.addBike('BIKE004', 'STN003', 'e-bike');
    bmsManager.addBike('BIKE005', 'STN003', 'standard');
    
    console.log('BMS demo data initialized successfully');
}

function setupRoutes() {
    // Basic info endpoint
    app.get('/', (req, res) => {
        res.json({ 
            message: 'CodeBusters BMS API Server with R-BMS-02 Implementation', 
            version: '2.0.0',
            endpoints: [
                'POST /api/bikes/:id/reserve - Reserve a bike',
                'POST /api/bikes/:id/return - Return a bike',
                'GET /api/users/:id/reservation - Check reservation status',
                'GET /api/transitions - View state transition history',
                'GET /api/bikes - Get all bikes',
                'GET /api/users - Get all users',
                'GET /api/stations - Get all stations (R-BMS-02)',
                'GET /api/stations/:id - Get station details (R-BMS-02)',
                'POST /api/stations - Add new station (R-BMS-02)',
                'POST /api/rent - Checkout bike (Business Rule: → on_trip; decrement count)',
                'POST /api/return - Return bike (Business Rule: → available; increment count)',
                'POST /api/manual-move - Manual move bike A→B (Business Rule: atomic decrement/increment)',
                'GET /api/bms/overview - System overview with occupancy accounting'
            ]
        });
    });

    // BMS Routes
    app.use('/api', createReservationRoutes(reservationService, bmsService));

    // Keep existing simple routes for compatibility
    app.get('/api/bikes', (req, res) => {
        db.all('SELECT * FROM bikes', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ bikes: rows });
        });
    });

    app.get('/api/users', (req, res) => {
        db.all('SELECT id, username, role, created_at FROM users', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ users: rows });
        });
    });

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

    // Add a new bike (operator only)
    app.post('/api/bikes', authenticateUser, requireOperator, (req, res) => {
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

    // Authentication endpoints (keep existing)
    app.post('/api/register', (req, res) => {
        const { username, password, role = 'rider' } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }
        
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
                        message: 'Internal server error' 
                    });
                }
                
                res.json({
                    success: true,
                    message: 'User registered successfully',
                    user: { id: this.lastID, username: username, role: role }
                });
            }
        );
    });

    app.post('/api/login', (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }
        
        db.get(
            'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
            [username, password],
            (err, row) => {
                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal server error' 
                    });
                }
                
                if (row) {
                    res.json({
                        success: true,
                        message: 'Login successful',
                        user: { id: row.id, username: row.username, role: row.role }
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid username or password'
                    });
                }
            }
        );
    });

    // ===== R-BMS-02 ENDPOINTS =====
    // R-BMS-02: Get all stations with capacity information
    app.get('/api/stations', (req, res) => {
        try {
            const stations = bmsManager.listAllStations();
            res.json({
                success: true,
                message: 'Stations retrieved successfully',
                stations: stations,
                totalStations: stations.length
            });
        } catch (error) {
            console.error('Error retrieving stations:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving stations',
                error: error.message
            });
        }
    });

    // R-BMS-01: Get stations data for map display (MUST be before /:id route)
    app.get('/api/stations/map', (req, res) => {
        try {
            // R-BMS-01: Load stations directly from configuration file for accurate data
            const configPath = './config/stations-config.json';
            if (!fs.existsSync(configPath)) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuration file not found'
                });
            }
            
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const transformedStations = configData.stations.map(station => {
                // Calculate correct bike counts and status
                const bikesList = station.bikes || [];
                const numberOfBikesDocked = bikesList.length;
                const freeDocks = station.capacity - numberOfBikesDocked;
                const bikesAvailable = bikesList.filter(bike => bike.status === 'available').length;
                
                // Determine correct status based on actual bike counts
                let actualStatus = station.status;
                if (numberOfBikesDocked === 0) {
                    actualStatus = 'empty';
                } else if (numberOfBikesDocked >= station.capacity) {
                    actualStatus = 'full';
                } else if (actualStatus !== 'out_of_service') {
                    actualStatus = 'occupied';
                }
                
                return {
                    // Required R-BMS-01 fields for Docking Station
                    id: station.id,
                    name: station.name,
                    status: actualStatus, // (empty | occupied | full | out_of_service)
                    latitude: station.latitude,
                    longitude: station.longitude,
                    address: station.address,
                    capacity: station.capacity, // (# of bikes total capacity)
                    numberOfBikesDocked: numberOfBikesDocked, // (actual count of bikes)
                    bikes: bikesList.map(bike => ({
                        id: bike.id,
                        type: bike.type, // (standard | e-bike)
                        status: bike.status, // (available | reserved | on_trip | maintenance)
                        reservationExpiry: bike.reservationExpiry || null
                    })), // List of bikes docked
                    reservationHoldTimeMinutes: station.reservationHoldTimeMinutes,
                    
                    // Calculated fields for consistency
                    bikesAvailable: bikesAvailable, // Only available bikes
                    freeDocks: freeDocks, // Capacity - bikes docked
                    occupiedDocks: numberOfBikesDocked, // Same as numberOfBikesDocked
                    isEmpty: numberOfBikesDocked === 0,
                    isFull: numberOfBikesDocked >= station.capacity,
                    isActive: actualStatus !== 'out_of_service',
                    isOutOfService: actualStatus === 'out_of_service',
                    
                    // Additional bike breakdowns
                    standardBikes: bikesList.filter(bike => bike.type === 'standard').length,
                    eBikes: bikesList.filter(bike => bike.type === 'e-bike').length,
                    reservedBikes: bikesList.filter(bike => bike.status === 'reserved').length,
                    maintenanceBikes: bikesList.filter(bike => bike.status === 'maintenance').length
                };
            });
            
            res.json({
                success: true,
                message: 'R-BMS-01: Stations data retrieved for map display',
                stations: transformedStations,
                totalStations: transformedStations.length
            });
                if (err) {
                    console.error('Error retrieving stations:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error retrieving stations data'
                    });
                }
                
                // R-BMS-01: Add configuration coordinates and data for map display
                const stationCoordinates = {
                    'STN001': { lat: 45.4973, lng: -73.5792, name: 'Concordia University - Hall Building', address: '1455 De Maisonneuve Blvd W, Montreal, QC H3G 1M8' },
                    'STN002': { lat: 45.5017, lng: -73.5673, name: 'Place du Canada', address: '1010 De La Gauchetière St W, Montreal, QC H3B 2N2' },
                    'STN003': { lat: 45.5088, lng: -73.5536, name: 'Old Port Montreal', address: '333 Rue de la Commune O, Montreal, QC H2Y 2E2' },
                    'STN004': { lat: 45.5225, lng: -73.5692, name: 'Parc La Fontaine', address: '3819 Calixa-Lavallée Ave, Montreal, QC H2L 3A7' },
                    'STN005': { lat: 45.4761, lng: -73.5844, name: 'Atwater Market', address: '138 Atwater Ave, Montreal, QC H4C 2G3' },
                    'STN006': { lat: 45.5048, lng: -73.5762, name: 'McGill University - Roddick Gates', address: '845 Sherbrooke St W, Montreal, QC H3A 0G4' },
                    'STN007': { lat: 45.5196, lng: -73.5816, name: 'Mont-Royal Metro Station', address: '1175 Mont-Royal Ave E, Montreal, QC H2J 1Y7' },
                    'STN008': { lat: 45.5080, lng: -73.5656, name: 'Quartier des Spectacles', address: '175 Sainte-Catherine St W, Montreal, QC H2X 1Z8' },
                    'STN009': { lat: 45.5581, lng: -73.5515, name: 'Olympic Stadium', address: '4545 Pierre-de Coubertin Ave, Montreal, QC H1V 0B2' },
                    'STN010': { lat: 45.5353, lng: -73.6180, name: 'Jean-Talon Market', address: '7070 Henri Julien Ave, Montreal, QC H2S 3S3' },
                    'STN011': { lat: 45.5597, lng: -73.5496, name: 'Biodome de Montreal', address: '4777 Pierre-de Coubertin Ave, Montreal, QC H1V 1B3' },
                    'STN012': { lat: 45.5267, lng: -73.5878, name: 'Plateau-Mont-Royal - Parc Laurier', address: '3830 Laurier Ave E, Montreal, QC H2L 4K6' },
                    'STN013': { lat: 45.4889, lng: -73.5969, name: 'Westmount Park', address: '4574 Sherbrooke St W, Westmount, QC H3Z 1E7' },
                    'STN014': { lat: 45.5154, lng: -73.5601, name: 'Berri-UQAM Metro Station', address: '1717 Berri St, Montreal, QC H2L 4E9' },
                    'STN015': { lat: 45.4739, lng: -73.5854, name: 'Lachine Canal - Atwater', address: '2001 Saint-Patrick St, Montreal, QC H3K 3C8' }
                };
                
                // Transform stations data to match R-BMS-01 requirements
                const transformedStations = stations.map((station, index) => {
                    const coords = stationCoordinates[station.id] || stationCoordinates[`STN00${index + 1}`] || { lat: 45.5017 + (index * 0.01), lng: -73.5673 + (index * 0.01), name: station.name, address: 'Montreal, QC' };
                    
                    // Helper function to map status to R-BMS-01 format
                    const mapStatusToRBMS01 = (status) => {
                        const statusMap = {
                            'active': 'occupied',
                            'full': 'full', 
                            'empty': 'empty',
                            'maintenance': 'out_of_service',
                            'out_of_service': 'out_of_service'
                        };
                        return statusMap[status] || 'occupied';
                    };
                    
                    return {
                        // Required R-BMS-01 fields for Docking Station
                        id: station.id,
                        name: coords.name || station.name || `Station ${station.id}`,
                        status: mapStatusToRBMS01(station.status), // Convert to R-BMS-01 status format
                        latitude: coords.lat,
                        longitude: coords.lng,
                        address: coords.address,
                        capacity: station.capacity,
                        numberOfBikesDocked: station.numberOfBikesDocked || 0,
                        bikes: station.bikes || [], // List of bikes docked
                        reservationHoldTimeMinutes: station.reservationHoldTimeMinutes || 15,
                        
                        // Additional useful fields
                        bikesAvailable: station.bikesAvailable || 0,
                        freeDocks: station.freeDocks || station.capacity,
                        occupiedDocks: station.occupiedDocks || 0,
                        isEmpty: station.isEmpty || false,
                        isFull: station.isFull || false,
                        isActive: station.isActive !== false,
                        isOutOfService: station.status === 'out_of_service'
                    };
                });
                
                res.json({
                    success: true,
                    message: 'R-BMS-01: Stations data retrieved for map display',
                    stations: transformedStations,
                    totalStations: transformedStations.length
        } catch (error) {
            console.error('Error retrieving stations for map:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving stations data for map',
                error: error.message
            });
        }
    });

    // R-BMS-02: Get specific station details
    app.get('/api/stations/:id', (req, res) => {
        try {
            const stationId = req.params.id;
            const stationInfo = bmsManager.getStationInfo(stationId);
            
            if (!stationInfo) {
                return res.status(404).json({
                    success: false,
                    message: `Station ${stationId} not found`
                });
            }
            
            res.json({
                success: true,
                station: stationInfo
            });
        } catch (error) {
            console.error('Error retrieving station:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving station details',
                error: error.message
            });
        }
    });

    // R-BMS-02: Add new station (operator only)
    app.post('/api/stations', authenticateUser, requireOperator, (req, res) => {
        try {
            const { stationId, capacity, location } = req.body;
            
            if (!stationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID is required'
                });
            }
            
            const result = bmsManager.addStation(stationId, capacity, location);
            
            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error adding station:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding station',
                error: error.message
            });
        }
    });

    // R-BMS-02: Rent a bike (undocking with empty station protection) - riders only
    app.post('/api/rent', authenticateUser, requireRider, (req, res) => {
        try {
            const { stationId, bikeId, userId } = req.body;
            
            if (!stationId || !bikeId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID, Bike ID, and User ID are required'
                });
            }

            // Validate ownership - riders can only rent for themselves
            if (req.user.role === 'rider' && req.user.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Riders can only rent bikes for themselves',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            
            // bmsManager.rentBike expects (userId, stationId, bikeId)
            const result = bmsManager.rentBike(userId, stationId, bikeId);
            
            if (result.success) {
                res.json(result);
            } else {
                // R-BMS-02: Return appropriate status codes for blocked operations
                const statusCode = result.operation === 'undock_failed_station_empty' ? 422 : 400;
                res.status(statusCode).json(result);
            }
        } catch (error) {
            console.error('Error renting bike:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing bike rental',
                error: error.message
            });
        }
    });

    // R-BMS-02: Return a bike (docking with full station protection) - riders only
    app.post('/api/return', authenticateUser, requireRider, (req, res) => {
        try {
            const { stationId, bikeId, userId } = req.body;
            
            if (!stationId || !bikeId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID, Bike ID, and User ID are required'
                });
            }

            // Validate ownership - riders can only return bikes they rented
            if (req.user.role === 'rider' && req.user.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Riders can only return their own bikes',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            
            // bmsManager.returnBike expects (userId, bikeId, stationId)
            const result = bmsManager.returnBike(userId, bikeId, stationId);
            
            if (result.success) {
                res.json(result);
            } else {
                // R-BMS-02: Return appropriate status codes for blocked operations
                const statusCode = result.operation === 'dock_failed_station_full' ? 422 : 400;
                res.status(statusCode).json(result);
            }
        } catch (error) {
            console.error('Error returning bike:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing bike return',
                error: error.message
            });
        }
    });

    // R-BMS-02: Get BMS system overview with statistics
    app.get('/api/bms/overview', (req, res) => {
        try {
            const overview = bmsManager.getSystemOverview();
            res.json({
                success: true,
                message: 'BMS system overview retrieved successfully',
                overview: overview,
                compliance: 'R-BMS-02: Prevents undocking from empty stations and docking to full stations'
            });
        } catch (error) {
            console.error('Error retrieving BMS overview:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving system overview',
                error: error.message
            });
        }
    });

    // R-BMS-02: Station maintenance endpoint (operator only)
    app.post('/api/stations/:id/maintenance', authenticateUser, requireOperator, (req, res) => {
        try {
            const stationId = req.params.id;
            const { action } = req.body; // 'start' or 'end'
            
            const result = bmsManager.setStationMaintenance(stationId, action === 'start');
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Error updating station maintenance:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating station maintenance status',
                error: error.message
            });
        }
    });

    // Business Rule: Manual move - operator moves bike A→B (atomic decrement/increment) - operator only
    app.post('/api/manual-move', authenticateUser, requireOperator, (req, res) => {
        try {
            const { bikeId, fromStationId, toStationId, operatorId } = req.body;
            
            if (!bikeId || !fromStationId || !toStationId || !operatorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Bike ID, From Station ID, To Station ID, and Operator ID are required'
                });
            }

            const result = bmsManager.manualMoveBike(bikeId, fromStationId, toStationId, operatorId);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in manual bike move:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing manual bike move',
                error: error.message
            });
        }
    });

    // ===== R-BMS-01 MAP ENDPOINTS MOVED ABOVE =====

    // R-BMS-01: Get bikes data for map display
    app.get('/api/bikes/map', (req, res) => {
        try {
            // R-BMS-01: Get bikes with station information for map display
            const stations = bmsManager.listAllStations();
            const allBikes = [];
            
            // Station coordinates for R-BMS-01
            const stationCoordinates = {
                'STN001': { lat: 45.4973, lng: -73.5792, name: 'Concordia University - Hall Building' },
                'STN002': { lat: 45.5017, lng: -73.5673, name: 'Place du Canada' },
                'STN003': { lat: 45.5088, lng: -73.5536, name: 'Old Port Montreal' },
                'STN004': { lat: 45.5225, lng: -73.5692, name: 'Parc La Fontaine' },
                'STN005': { lat: 45.4761, lng: -73.5844, name: 'Atwater Market' },
                'STN006': { lat: 45.5048, lng: -73.5762, name: 'McGill University - Roddick Gates' },
                'STN007': { lat: 45.5196, lng: -73.5816, name: 'Mont-Royal Metro Station' },
                'STN008': { lat: 45.5080, lng: -73.5656, name: 'Quartier des Spectacles' },
                'STN009': { lat: 45.5581, lng: -73.5515, name: 'Olympic Stadium' },
                'STN010': { lat: 45.5353, lng: -73.6180, name: 'Jean-Talon Market' },
                'STN011': { lat: 45.5597, lng: -73.5496, name: 'Biodome de Montreal' },
                'STN012': { lat: 45.5267, lng: -73.5878, name: 'Plateau-Mont-Royal - Parc Laurier' },
                'STN013': { lat: 45.4889, lng: -73.5969, name: 'Westmount Park' },
                'STN014': { lat: 45.5154, lng: -73.5601, name: 'Berri-UQAM Metro Station' },
                'STN015': { lat: 45.4739, lng: -73.5854, name: 'Lachine Canal - Atwater' }
            };
            
            // Extract all bikes from all stations with their locations
            stations.forEach(station => {
                if (station.bikes && station.bikes.length > 0) {
                    station.bikes.forEach(bike => {
                        const coords = stationCoordinates[station.id] || { lat: 45.5017, lng: -73.5673, name: station.name };
                        
                        allBikes.push({
                            // Required R-BMS-01 fields for Bike
                            id: bike.id,
                            status: bike.status || 'available', // (available | reserved | on_trip | maintenance)
                            type: bike.type || 'standard', // (standard | e-bike)
                            reservationExpiry: bike.reservationExpiry || null, // date and time if applicable, otherwise empty
                            
                            // Station information for map display
                            station: {
                                id: station.id,
                                stationName: coords.name || station.name,
                                latitude: coords.lat,
                                longitude: coords.lng
                            }
                        });
                    });
                }
            });
            
            res.json({
                success: true,
                message: 'R-BMS-01: Bikes data retrieved for map display',
                bikes: allBikes,
                totalBikes: allBikes.length
            });
        } catch (error) {
            console.error('Error retrieving bikes for map:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving bikes data for map',
                error: error.message
            });
        }
    });

    // R-BMS-01: Reload configuration from file
    app.post('/api/config/reload', authenticateUser, requireOperator, async (req, res) => {
        try {
            if (!configDatabaseService) {
                return res.status(503).json({
                    success: false,
                    message: 'Configuration service not initialized'
                });
            }
            
            const summary = await configDatabaseService.initializeFromConfig();
            
            res.json({
                success: true,
                message: 'R-BMS-01: Configuration reloaded successfully',
                summary: summary
            });
        } catch (error) {
            console.error('Error reloading configuration:', error);
            res.status(500).json({
                success: false,
                message: 'Error reloading configuration',
                error: error.message
            });
        }
    });

    // R-BMS-01: Get configuration summary
    app.get('/api/config/summary', (req, res) => {
        try {
            if (!configDatabaseService) {
                return res.status(503).json({
                    success: false,
                    message: 'Configuration service not initialized'
                });
            }
            
            const summary = configDatabaseService.getSummary();
            res.json({
                success: true,
                message: 'R-BMS-01: Configuration summary retrieved',
                summary: summary
            });
        } catch (error) {
            console.error('Error retrieving configuration summary:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving configuration summary',
                error: error.message
            });
        }
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
}

function setupBackgroundTasks() {
    // R-BMS-03: Run expiry check every minute
    setInterval(async () => {
        try {
            const expiredCount = await reservationService.expireOldReservations();
            if (expiredCount > 0) {
                console.log(`Expired ${expiredCount} old reservations`);
            }
        } catch (error) {
            console.error('Error in background reservation cleanup:', error);
        }
    }, 60000); // Every 60 seconds

    console.log('Background tasks initialized');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    
    if (db) {
        await new Promise((resolve) => {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        });
    }
    
    process.exit(0);
});

// Start server
async function startServer() {
    await initializeApp();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Frontend should be running on http://localhost:3000`);
        console.log(`📊 BMS v2.0 with organized architecture ready!`);
        console.log(`🛡️  R-BMS-02 Implementation: Prevents undocking from empty stations and docking to full stations`);
        console.log(`🏪 Demo stations initialized: STN001 (5 bikes), STN002 (3 bikes), STN003 (8 bikes)`);
    });
}

startServer().catch(console.error);