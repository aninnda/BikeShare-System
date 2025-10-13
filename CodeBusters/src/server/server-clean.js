// ...existing code...

// (Place this route after app and bmsManager are initialized, before app.listen)
// Notifications: Get empty/full docking station notifications for user profile
// This must be after bmsManager is initialized and demo data is loaded
// ...existing code...
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

// Billing calculation function
function calculateRentalCost(startTime, endTime, bikeType) {
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    
    // Calculate duration in minutes
    const durationMs = endDateTime - startDateTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60)); // Round up to next minute
    
    // Pricing: standard bikes = $0.10/min, e-bikes = $0.25/min
    const ratePerMinute = bikeType === 'e-bike' ? 0.25 : 0.10;
    
    const totalCost = durationMinutes * ratePerMinute;
    
    return {
        durationMinutes,
        ratePerMinute,
        totalCost: Math.round(totalCost * 100) / 100 // Round to 2 decimal places
    };
}

// Business Rule: Check if user has active rental
function checkUserActiveRental(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM rentals WHERE user_id = ? AND status = ?',
            [userId, 'active'],
            (err, rental) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rental);
                }
            }
        );
    });
}

// Business Rule: Check if user has active reservation
function checkUserActiveReservation(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM r_bms_bikes 
             WHERE reserved_by_user_id = ? AND status = 'reserved' 
             AND (reservation_expiry IS NULL OR reservation_expiry > datetime('now'))`,
            [userId],
            (err, reservation) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(reservation);
                }
            }
        );
    });
}

// Business Rule: Validate user can rent (no active rental, no active reservation OR reservation is for the same bike)
async function validateUserCanRent(userId, bikeId) {
    try {
        const activeRental = await checkUserActiveRental(userId);
        if (activeRental) {
            return {
                canRent: false,
                reason: 'USER_HAS_ACTIVE_RENTAL',
                message: 'You already have an active bike rental. Please return it before renting another bike.',
                activeRental: {
                    bikeId: activeRental.bike_id,
                    startTime: activeRental.start_time,
                    stationId: activeRental.station_id
                }
            };
        }

        const activeReservation = await checkUserActiveReservation(userId);
        if (activeReservation && activeReservation.id !== bikeId) {
            return {
                canRent: false,
                reason: 'USER_HAS_DIFFERENT_RESERVATION',
                message: 'You have a reservation for a different bike. You can only rent the bike you reserved, or cancel your current reservation first.',
                activeReservation: {
                    bikeId: activeReservation.id,
                    stationId: activeReservation.station_id,
                    expiresAt: activeReservation.reservation_expiry
                }
            };
        }

        return { canRent: true };
    } catch (error) {
        throw new Error(`Error validating user rental status: ${error.message}`);
    }
}

// Business Rule: Validate user can reserve (no active rental, no active reservation)
async function validateUserCanReserve(userId) {
    try {
        const activeRental = await checkUserActiveRental(userId);
        if (activeRental) {
            return {
                canReserve: false,
                reason: 'USER_HAS_ACTIVE_RENTAL',
                message: 'You cannot make a reservation while you have an active bike rental. Please return your bike first.',
                activeRental: {
                    bikeId: activeRental.bike_id,
                    startTime: activeRental.start_time,
                    stationId: activeRental.station_id
                }
            };
        }

        const activeReservation = await checkUserActiveReservation(userId);
        if (activeReservation) {
            return {
                canReserve: false,
                reason: 'USER_HAS_ACTIVE_RESERVATION',
                message: 'You already have an active reservation. Please cancel it before making a new reservation.',
                activeReservation: {
                    bikeId: activeReservation.id,
                    stationId: activeReservation.station_id,
                    expiresAt: activeReservation.reservation_expiry
                }
            };
        }

        return { canReserve: true };
    } catch (error) {
        throw new Error(`Error validating user reservation status: ${error.message}`);
    }
}

// Initialize application
async function initializeApp() {
    try {
        // Initialize database
        const database = new Database();
        db = await database.connect();
        
        // Helper function to log user activities (global scope for access across all functions)
        logUserActivity = (userId, type, bikeId, stationId = null, details = {}) => {
            const activity = {
                user_id: userId,
                activity_type: type,
                bike_id: bikeId,
                station_id: stationId,
                timestamp: new Date().toISOString(),
                details: JSON.stringify(details)
            };

            // Insert into user_activities table (create table if it doesn't exist)
            db.run(`CREATE TABLE IF NOT EXISTS user_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                activity_type TEXT NOT NULL,
                bike_id TEXT,
                station_id TEXT,
                timestamp TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (createErr) => {
                if (!createErr) {
                    db.run(`INSERT INTO user_activities (user_id, activity_type, bike_id, station_id, timestamp, details)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                        [activity.user_id, activity.activity_type, activity.bike_id, activity.station_id, activity.timestamp, activity.details],
                        (insertErr) => {
                            if (insertErr) {
                                console.error('Error logging user activity:', insertErr);
                            } else {
                                console.log(`Activity logged: ${type} for user ${userId}, bike ${bikeId}`);
                            }
                        }
                    );
                }
            });
        };
        
        // Initialize services
        bmsService = new BMSService(db);
        reservationService = new ReservationService(db, bmsService);
        
        // Initialize BMS Manager for R-BMS-02 compliance
        bmsManager = new BMSManager();
        
        // R-BMS-01: Initialize Configuration Database Service
        configDatabaseService = new ConfigDatabaseService(db);
        
        // R-BMS-01: Load system from configuration file
        const configSummary = await initializeFromConfig();

        // Always populate bmsManager with all stations and bikes from config
        if (configDatabaseService && configDatabaseService.stations && configDatabaseService.bikes) {
            bmsManager.stations.clear();
            bmsManager.bikes.clear();
            for (const [stationId, station] of configDatabaseService.stations) {
                bmsManager.stations.set(stationId, station);
            }
            for (const [bikeId, bike] of configDatabaseService.bikes) {
                bmsManager.bikes.set(bikeId, bike);
            }
            console.log('✅ bmsManager populated with all stations and bikes from config');
        } else {
            console.error('❌ Could not load stations/bikes from config. No stations will be available.');
        }
        
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
    
    // Add sample completed rentals to demonstrate duration formatting
    addSampleRentalHistory();
}

async function addSampleRentalHistory() {
    console.log('Adding sample rental history for duration testing...');
    
    try {
        const userId = 'user123';
        const now = new Date();
        
        // Sample 1: 30-second rental (should show as "30s")
        const rental1Start = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
        const rental1End = new Date(rental1Start.getTime() + 30 * 1000); // 30 seconds duration
        
        // Calculate correct cost: 30s = 1 minute (rounded up) × $0.10 = $0.10
        await logUserActivity(userId, 'rental_completed', 'BIKE001', {
            bikeType: 'standard',
            startStation: 'Concordia University - Hall Building',
            endStation: 'Place du Canada',
            startTime: rental1Start.toISOString(),
            endTime: rental1End.toISOString(),
            duration: {
                seconds: 30,
                minutes: 1, // Rounded up
                formatted: '30s'
            },
            cost: 0.10, // 1 minute × $0.10/min = $0.10
            description: '🏁 Completed ride: 🚴 Standard BIKE001 from Concordia University - Hall Building to Place du Canada (30s) - $0.10'
        });
        
        // Sample 2: 2-minute rental (should show as "2m")
        const rental2Start = new Date(now.getTime() - 8 * 60 * 1000); // 8 minutes ago
        const rental2End = new Date(rental2Start.getTime() + 2 * 60 * 1000); // 2 minutes duration
        
        // Calculate correct cost: 2 minutes × $0.25/min = $0.50
        await logUserActivity(userId, 'rental_completed', 'BIKE002', {
            bikeType: 'e-bike',
            startStation: 'Place du Canada',
            endStation: 'Old Port Montreal',
            startTime: rental2Start.toISOString(),
            endTime: rental2End.toISOString(),
            duration: {
                seconds: 120,
                minutes: 2,
                formatted: '2m'
            },
            cost: 0.50, // 2 minutes × $0.25/min = $0.50
            description: '🏁 Completed ride: ⚡ E-Bike BIKE002 from Place du Canada to Old Port Montreal (2m) - $0.50'
        });
        
        // Sample 3: 1 hour 15-minute rental (should show as "1h 15m")
        const rental3Start = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        const rental3End = new Date(rental3Start.getTime() + 75 * 60 * 1000); // 75 minutes duration
        
        // Calculate correct cost: 75 minutes × $0.10/min = $7.50
        await logUserActivity(userId, 'rental_completed', 'BIKE003', {
            bikeType: 'standard',
            startStation: 'Old Port Montreal',
            endStation: 'Atwater Market',
            startTime: rental3Start.toISOString(),
            endTime: rental3End.toISOString(),
            duration: {
                seconds: 4500,
                minutes: 75,
                formatted: '1h 15m'
            },
            cost: 7.50, // 75 minutes × $0.10/min = $7.50
            description: '🏁 Completed ride: 🚴 Standard BIKE003 from Old Port Montreal to Atwater Market (1h 15m) - $7.50'
        });
        
        console.log('✅ Sample rental history added successfully!');
        console.log('   - 30s rental (BIKE001): Duration "30s" | Cost $0.10 (1min × $0.10)');
        console.log('   - 2m rental (BIKE002): Duration "2m" | Cost $0.50 (2min × $0.25)');
        console.log('   - 1h 15m rental (BIKE003): Duration "1h 15m" | Cost $7.50 (75min × $0.10)');
        
    } catch (error) {
        console.error('Error adding sample rental history:', error);
    }
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

    // Get a single user's active rental (if any)
    app.get('/api/users/:userId/rental', (req, res) => {
        const { userId } = req.params;

        // Get active rental for user with station and bike info
        db.get(`
            SELECT r.*, u.username, s.name AS stationName, b.type AS bikeType
            FROM rentals r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN stations s ON r.station_id = s.id
            LEFT JOIN r_bms_bikes b ON r.bike_id = b.id
            WHERE r.user_id = ? AND r.status = 'active'
            LIMIT 1
        `, [userId], (err, row) => {
            if (err) {
                console.error('Error fetching user rental:', err.message);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }

            if (!row) {
                return res.json({ success: true, hasActiveRental: false, rental: null });
            }

            // Map DB row to normalized rental object
            const rental = {
                bikeId: row.bike_id,
                stationId: row.station_id,
                stationName: row.stationName || 'Unknown Station',
                username: row.username || 'Unknown User',
                userId: String(row.user_id),
                startTime: row.start_time,
                status: row.status,
                bikeType: row.bikeType || 'standard'
            };

            res.json({ success: true, hasActiveRental: true, rental });
        });
    });

    // Get comprehensive user activity history (reservations, cancellations, rentals) with bike types
    app.get('/api/users/:userId/activity', (req, res) => {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;

        // Create a comprehensive activity history by combining different activity types
        const activities = [];

        // Function to add activities and sort them chronologically
        const finalizeActivities = () => {
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const paginatedActivities = activities.slice(offset, offset + limit);
            
            res.json({
                success: true,
                activities: paginatedActivities,
                total: activities.length
            });
        };

        let completedQueries = 0;
        const totalQueries = 3; // rentals, reservations, rental_starts

        // 1. Get completed rentals
        db.all(`
            SELECT 
                r.id,
                r.bike_id,
                r.start_time,
                r.end_time,
                r.total_cost,
                r.status,
                r.station_id as start_station_id,
                s1.name as start_station_name,
                s2.name as end_station_name,
                b.type as bike_type
            FROM rentals r
            LEFT JOIN stations s1 ON r.station_id = s1.id
            LEFT JOIN r_bms_bikes b ON r.bike_id = b.id
            LEFT JOIN (
                SELECT bike_id, station_id, MIN(updated_at) as return_time
                FROM r_bms_bikes 
                WHERE status = 'available'
                GROUP BY bike_id
            ) s2_lookup ON r.bike_id = s2_lookup.bike_id
            LEFT JOIN stations s2 ON s2_lookup.station_id = s2.id
            WHERE r.user_id = ? AND r.status = 'completed'
            ORDER BY r.start_time DESC
        `, [userId], (err, rentalRows) => {
            if (!err) {
                rentalRows.forEach(row => {
                    const startTime = new Date(row.start_time);
                    const endTime = new Date(row.end_time);
                    const durationMs = endTime - startTime;
                    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;

                    const bikeType = row.bike_type || 'standard';
                    const bikeTypeLabel = bikeType === 'e-bike' ? '⚡ E-Bike' : '🚴 Standard';
                    const rentalEndTime = new Date(row.end_time);
                    const timeFormatted = rentalEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const dateFormatted = rentalEndTime.toLocaleDateString();
                    
                    // Guarantee cost, duration, and bike type fields for frontend
                    let safeDurationMinutes = Math.max(1, durationMinutes);
                    let safeCost = row.total_cost;
                    if (typeof safeCost !== 'number' || isNaN(safeCost)) {
                        // Calculate if missing
                        const rate = (bikeType === 'e-bike' || bikeType === 'electric') ? 0.25 : 0.10;
                        safeCost = safeDurationMinutes * rate;
                    }
                    activities.push({
                        id: `rental-${row.id}`,
                        type: 'rental_completed',
                        timestamp: row.end_time,
                        bikeId: row.bike_id,
                        bikeType: bikeType,
                        bike_type_raw: bikeType,
                        bikeTypeLabel: bikeTypeLabel,
                        startStation: row.start_station_name,
                        endStation: row.end_station_name || 'Unknown Station',
                        startTime: row.start_time,
                        endTime: row.end_time,
                        timeFormatted: timeFormatted,
                        dateFormatted: dateFormatted,
                        duration: {
                            minutes: safeDurationMinutes,
                            seconds: Math.floor(durationMs / 1000),
                            formatted: safeDurationMinutes < 1 
                                ? `${Math.floor(durationMs / 1000)}s`
                                : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                        },
                        duration_minutes: safeDurationMinutes,
                        cost: Number(safeCost.toFixed(2)),
                        description: `🏁 Completed ride: ${bikeTypeLabel} ${row.bike_id} from ${row.start_station_name} to ${row.end_station_name || 'Unknown Station'} (${safeDurationMinutes < 1 ? `${Math.floor(durationMs / 1000)}s` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}) - $${Number(safeCost.toFixed(2))}`
                    });
                });
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) finalizeActivities();
        });

        // 2. Get reservation history and cancellations
        db.all(`
            SELECT 
                b.id as bike_id,
                b.type as bike_type,
                b.updated_at as reserved_at,
                b.reservation_expires_at,
                b.status as current_status,
                s.name as station_name,
                s.id as station_id,
                'reserved' as action_type
            FROM r_bms_bikes b
            LEFT JOIN stations s ON b.station_id = s.id
            WHERE b.reserved_by_user_id = ? AND b.status = 'reserved'
            ORDER BY b.updated_at DESC
        `, [userId], (err, reservationRows) => {
            if (!err) {
                reservationRows.forEach(row => {
                    const bikeType = row.bike_type || 'standard';
                    const bikeTypeLabel = bikeType === 'e-bike' ? '⚡ E-Bike' : '🚴 Standard';
                    const reservedTime = new Date(row.reserved_at);
                    const timeFormatted = reservedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    // Add reservation activity
                    activities.push({
                        id: `reservation-${row.bike_id}-${row.reserved_at}`,
                        type: 'bike_reserved',
                        timestamp: row.reserved_at,
                        bikeId: row.bike_id,
                        bikeType: bikeType,
                        bikeTypeLabel: bikeTypeLabel,
                        station: row.station_name,
                        stationId: row.station_id,
                        expiresAt: row.reservation_expires_at,
                        timeFormatted: timeFormatted,
                        description: `📅 Reserved ${bikeTypeLabel} ${row.bike_id} at ${row.station_name} (${timeFormatted})`
                    });
                    
                    // If bike is no longer reserved by this user and was previously reserved, 
                    // it means the reservation was cancelled or expired
                    if (row.current_status !== 'reserved') {
                        // Estimate cancellation time (this is approximate since we don't track exact cancellation time)
                        const estimatedCancelTime = new Date(Math.min(
                            new Date(row.reservation_expires_at).getTime(),
                            Date.now()
                        ));
                        
                        activities.push({
                            id: `reservation-cancelled-${row.bike_id}-${row.reserved_at}`,
                            type: 'reservation_cancelled',
                            timestamp: estimatedCancelTime.toISOString(),
                            bikeId: row.bike_id,
                            bikeType: bikeType,
                            bikeTypeLabel: bikeTypeLabel,
                            station: row.station_name,
                            stationId: row.station_id,
                            timeFormatted: estimatedCancelTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            description: `❌ Cancelled reservation for ${bikeTypeLabel} ${row.bike_id} at ${row.station_name}`
                        });
                    }
                });
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) finalizeActivities();
        });

        // 3. Get rental start activities
        db.all(`
            SELECT 
                r.id,
                r.bike_id,
                r.start_time,
                r.station_id,
                s.name as station_name,
                b.type as bike_type
            FROM rentals r
            LEFT JOIN stations s ON r.station_id = s.id
            LEFT JOIN r_bms_bikes b ON r.bike_id = b.id
            WHERE r.user_id = ?
            ORDER BY r.start_time DESC
        `, [userId], (err, rentalStartRows) => {
            if (!err) {
                rentalStartRows.forEach(row => {
                    const bikeType = row.bike_type || 'standard';
                    const bikeTypeLabel = bikeType === 'e-bike' ? '⚡ E-Bike' : '🚴 Standard';
                    const startTime = new Date(row.start_time);
                    const timeFormatted = startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const dateFormatted = startTime.toLocaleDateString();
                    
                    activities.push({
                        id: `rental_start-${row.id}`,
                        type: 'rental_started',
                        timestamp: row.start_time,
                        bikeId: row.bike_id,
                        bikeType: bikeType,
                        bikeTypeLabel: bikeTypeLabel,
                        station: row.station_name,
                        stationId: row.station_id,
                        timeFormatted: timeFormatted,
                        dateFormatted: dateFormatted,
                        description: `🚴‍♂️ Started rental: ${bikeTypeLabel} ${row.bike_id} from ${row.station_name} at ${timeFormatted} on ${dateFormatted}`
                    });
                });
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) finalizeActivities();
        });
    });



    // Log user activity for history tracking
    app.post('/api/users/:userId/activity', (req, res) => {
        const { userId } = req.params;
        const { type, bikeId, stationId, details } = req.body;
        
        logUserActivity(userId, type, bikeId, stationId, details);
        res.json({ success: true, message: 'Activity logged' });
    });

    // Get user's ride history with billing information
    app.get('/api/users/:userId/rides', (req, res) => {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50; // Default to 50 rides
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;

        // Get user's completed rentals with station and bike info
        db.all(`
            SELECT 
                r.id,
                r.bike_id,
                r.start_time,
                r.end_time,
                r.total_cost,
                r.status,
                r.station_id as start_station_id,
                s1.name as start_station_name,
                s2.name as end_station_name,
                b.type as bike_type,
                u.username
            FROM rentals r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN stations s1 ON r.station_id = s1.id
            LEFT JOIN r_bms_bikes b ON r.bike_id = b.id
            LEFT JOIN (
                -- Get the station where the bike was returned (where it ended up)
                SELECT bike_id, station_id, MIN(updated_at) as return_time
                FROM r_bms_bikes 
                WHERE status = 'available'
                GROUP BY bike_id
            ) s2_lookup ON r.bike_id = s2_lookup.bike_id
            LEFT JOIN stations s2 ON s2_lookup.station_id = s2.id
            WHERE r.user_id = ? AND r.status = 'completed'
            ORDER BY r.start_time DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset], (err, rows) => {
            if (err) {
                console.error('Error fetching ride history:', err.message);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }

            // Format the rides for frontend consumption
            const rides = rows.map(row => {
                const startTime = new Date(row.start_time);
                const endTime = new Date(row.end_time);
                const durationMs = endTime - startTime;
                const durationMinutes = Math.ceil(durationMs / (1000 * 60));

                return {
                    id: row.id,
                    bikeId: row.bike_id,
                    bikeType: row.bike_type || 'standard',
                    startTime: row.start_time,
                    endTime: row.end_time,
                    startStation: {
                        id: row.start_station_id,
                        name: row.start_station_name || 'Unknown Station'
                    },
                    endStation: {
                        name: row.end_station_name || 'Unknown Station'
                    },
                    duration: {
                        minutes: durationMinutes,
                        seconds: Math.floor(durationMs / 1000),
                        formatted: durationMinutes < 1 
                            ? `${Math.floor(durationMs / 1000)}s`
                            : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                    },
                    cost: row.total_cost || 0,
                    status: row.status
                };
            });

            res.json({ 
                success: true, 
                rides,
                pagination: {
                    limit,
                    offset,
                    count: rows.length
                }
            });
        });
    });

    // Get user's active reservations
    app.get('/api/users/:userId/reservations', (req, res) => {
        const { userId } = req.params;

        // Get user's active reservations from database
        db.all(`
            SELECT 
                r.id as bike_id,
                r.type as bike_type,
                r.station_id,
                r.reservation_expiry,
                r.created_at as reserved_at,
                s.name as station_name,
                s.address as station_address
            FROM r_bms_bikes r
            LEFT JOIN stations s ON r.station_id = s.id
            WHERE r.reserved_by_user_id = ? 
            AND r.status = 'reserved'
            AND (r.reservation_expiry IS NULL OR r.reservation_expiry > datetime('now'))
            ORDER BY r.created_at DESC
        `, [userId], (err, rows) => {
            if (err) {
                console.error('Error fetching user reservations:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Internal server error' 
                });
            }

            // Format the reservations for frontend consumption
            const reservations = rows.map(row => ({
                bikeId: row.bike_id,
                bikeType: row.bike_type,
                stationId: row.station_id,
                stationName: row.station_name || 'Unknown Station',
                stationAddress: row.station_address || '',
                reservedAt: row.reserved_at,
                expiresAt: row.reservation_expiry,
                status: 'reserved'
            }));

            res.json({ 
                success: true, 
                reservations,
                count: reservations.length
            });
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
        const { username, password, firstName, lastName, email, address, role = 'rider' } = req.body;
        
        if (!username || !password || !firstName || !lastName || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password, first name, last name, and email are required' 
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address' 
            });
        }
        
        db.run(
            'INSERT INTO users (username, password, first_name, last_name, email, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, password, firstName, lastName, email, address, role],
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
                    user: { 
                        id: this.lastID, 
                        username: username, 
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        address: address,
                        role: role 
                    }
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
            'SELECT id, username, role, first_name, last_name, email, address FROM users WHERE username = ? AND password = ?',
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
                    // Clean up any orphaned reservations for this user
                    // (reservations that exist in stations config but not in active reservations)
                    cleanupOrphanedReservations(row.id, row.username).catch(error => {
                        console.error('Error cleaning up orphaned reservations:', error);
                    });
                    
                    res.json({
                        success: true,
                        message: 'Login successful',
                        user: { 
                            id: row.id, 
                            username: row.username, 
                            firstName: row.first_name,
                            lastName: row.last_name,
                            email: row.email,
                            address: row.address,
                            role: row.role
                        }
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

    // Profile update endpoint
    app.post('/api/profile/update', (req, res) => {
        const { userId, firstName, lastName, email, address } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'First name, last name, and email are required' 
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address' 
            });
        }
        
        // Update user profile in database
        db.run(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, address = ? WHERE id = ?',
            [firstName, lastName, email, address, userId],
            function(err) {
                if (err) {
                    console.error('Database error:', err.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal server error' 
                    });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                // Return updated user info
                db.get(
                    'SELECT id, username, first_name, last_name, email, address, role FROM users WHERE id = ?',
                    [userId],
                    (err, row) => {
                        if (err) {
                            console.error('Database error:', err.message);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Internal server error' 
                            });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Profile updated successfully',
                            user: {
                                id: row.id,
                                username: row.username,
                                firstName: row.first_name,
                                lastName: row.last_name,
                                email: row.email,
                                address: row.address,
                                role: row.role
                            }
                        });
                    }
                );
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

    // R-BMS-01: Get stations data for map display (MUST be before /:id route) - DATABASE VERSION
    app.get('/api/stations/map', async (req, res) => {
        try {
            // Load stations from database and get real-time bike data
            const stations = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM stations ORDER BY id', [], (err, stationRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(stationRows);
                });
            });

            const transformedStations = await Promise.all(stations.map(async (station) => {
                // Get real-time bike data from database for this station
                const bikesList = await new Promise((resolve, reject) => {
                    db.all(
                        'SELECT * FROM r_bms_bikes WHERE station_id = ? ORDER BY id',
                        [station.id],
                        (err, bikeRows) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(bikeRows || []);
                        }
                    );
                });
                
                // Separate bikes by status for proper counting (only include docked bikes)
                const availableBikes = bikesList.filter(bike => bike.status === 'available');
                const reservedBikes = bikesList.filter(bike => bike.status === 'reserved');
                const maintenanceBikes = bikesList.filter(bike => bike.status === 'maintenance');
                // Note: on_trip bikes have station_id = null, so they won't appear in bikesList
                
                // CORRECT LOGIC: Only available and reserved bikes count as "docked"
                const numberOfBikesDocked = availableBikes.length + reservedBikes.length;
                const freeDocks = station.capacity - numberOfBikesDocked;
                const bikesAvailable = availableBikes.length;
                
                // Determine correct status based on DOCKED bike counts
                let actualStatus = station.status;
                if (station.status === 'out_of_service') {
                    actualStatus = 'out_of_service';
                } else if (numberOfBikesDocked === 0) {
                    actualStatus = 'empty';
                } else if (numberOfBikesDocked >= station.capacity) {
                    actualStatus = 'full';
                } else {
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
                        status: bike.status, // (available | reserved | maintenance) - no on_trip here
                        reservationExpiry: bike.reservation_expiry || null,
                        reservedBy: null, // TODO: Add if needed
                        reservedAt: null   // TODO: Add if needed
                    })), // List of bikes currently docked at this station
                    reservationHoldTimeMinutes: station.reservation_hold_time_minutes,
                    
                    // Calculated fields for consistency
                    bikesAvailable: bikesAvailable, // Only available bikes
                    freeDocks: freeDocks, // Capacity - docked bikes
                    // Synthesized dock IDs for client to display available return docks
                    dockIds: Array.from({ length: station.capacity }, (_, i) => `${station.id}-D${String(i + 1).padStart(2, '0')}`),
                    freeDockIds: Array.from({ length: Math.max(0, freeDocks) }, (_, i) => `${station.id}-D${String(numberOfBikesDocked + i + 1).padStart(2, '0')}`),
                    occupiedDocks: numberOfBikesDocked, // Available + Reserved bikes only
                    isEmpty: numberOfBikesDocked === 0,
                    isFull: numberOfBikesDocked >= station.capacity,
                    isActive: actualStatus !== 'out_of_service',
                    isOutOfService: actualStatus === 'out_of_service',
                    
                    // Detailed bike breakdowns by status
                    availableBikesCount: availableBikes.length,
                    reservedBikesCount: reservedBikes.length,
                    maintenanceBikesCount: maintenanceBikes.length,
                    onTripBikesCount: 0, // on_trip bikes don't have station_id, so 0 here
                    
                    // Bike type breakdowns (for ALL bikes at station)
                    totalStandardBikes: bikesList.filter(bike => bike.type === 'standard').length,
                    totalEBikes: bikesList.filter(bike => bike.type === 'e-bike').length,
                    
                    // Docked bike type breakdowns (excludes maintenance)
                    dockedStandardBikes: [...availableBikes, ...reservedBikes].filter(bike => bike.type === 'standard').length,
                    dockedEBikes: [...availableBikes, ...reservedBikes].filter(bike => bike.type === 'e-bike').length
                };
            }));
            
            res.json({
                success: true,
                message: 'R-BMS-01: Stations data retrieved for map display',
                stations: transformedStations,
                totalStations: transformedStations.length
            });
            
        } catch (error) {
            console.error('Error retrieving stations for map:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving stations data for map',
                error: error.message
            });
        }
    });

    // Search stations by name and show available bikes (Database-driven)
    app.get('/api/stations/search', async (req, res) => {
        try {
            const { q: query } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query parameter "q" is required'
                });
            }
            
            // Search for stations that match the query (case-insensitive)
            const stations = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT * FROM stations 
                     WHERE LOWER(name) LIKE LOWER(?) 
                     OR LOWER(address) LIKE LOWER(?) 
                     ORDER BY name`,
                    [`%${query}%`, `%${query}%`],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });
            
            if (stations.length === 0) {
                return res.json({
                    success: true,
                    message: `No stations found matching "${query}"`,
                    stations: [],
                    totalResults: 0
                });
            }
            
            // Get bikes for each matching station from database
            const stationPromises = stations.map(async (station) => {
                const bikes = await new Promise((resolve, reject) => {
                    db.all(
                        'SELECT * FROM r_bms_bikes WHERE station_id = ? ORDER BY id',
                        [station.id],
                        (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows || []);
                        }
                    );
                });
                
                const availableBikes = bikes.filter(bike => bike.status === 'available');
                const reservedBikes = bikes.filter(bike => bike.status === 'reserved');
                const maintenanceBikes = bikes.filter(bike => bike.status === 'maintenance');
                
                const numberOfBikesDocked = bikes.length;
                const freeDocks = station.capacity - numberOfBikesDocked;
                
                // Generate dock IDs
                const dockIds = Array.from({length: station.capacity}, (_, i) => 
                    `${station.id}-D${String(i + 1).padStart(2, '0')}`
                );
                const occupiedDockIds = dockIds.slice(0, numberOfBikesDocked);
                const freeDockIds = dockIds.slice(numberOfBikesDocked);
                
                return {
                    id: station.id,
                    name: station.name,
                    address: station.address,
                    latitude: station.latitude,
                    longitude: station.longitude,
                    status: station.status,
                    capacity: station.capacity,
                    numberOfBikesDocked: numberOfBikesDocked,
                    bikes: bikes.map(bike => ({
                        id: bike.id,
                        type: bike.type,
                        status: bike.status,
                        reservationExpiry: bike.reservation_expiry,
                        reservedBy: bike.reserved_by,
                        reservedAt: bike.updated_at
                    })),
                    
                    // Frontend expects these specific structures
                    availableBikes: {
                        count: availableBikes.length,
                        bikes: availableBikes.map(bike => ({
                            id: bike.id,
                            type: bike.type,
                            status: bike.status,
                            reservationExpiry: bike.reservation_expiry,
                            reservedBy: bike.reserved_by,
                            reservedAt: bike.updated_at
                        }))
                    },
                    
                    reservedBikes: {
                        count: reservedBikes.length,
                        bikes: reservedBikes.map(bike => ({
                            id: bike.id,
                            type: bike.type,
                            status: bike.status,
                            reservationExpiry: bike.reservation_expiry,
                            reservedBy: bike.reserved_by,
                            reservedAt: bike.updated_at
                        }))
                    },
                    
                    maintenanceBikes: {
                        count: maintenanceBikes.length,
                        bikes: maintenanceBikes.map(bike => ({
                            id: bike.id,
                            type: bike.type,
                            status: bike.status,
                            reservationExpiry: bike.reservation_expiry,
                            reservedBy: bike.reserved_by,
                            reservedAt: bike.updated_at
                        }))
                    },
                    
                    // Summary for display
                    summary: `${availableBikes.length} available bikes (${availableBikes.filter(b => b.type === 'standard').length} standard, ${availableBikes.filter(b => b.type === 'e-bike').length} e-bike)${maintenanceBikes.length > 0 ? ` + ${maintenanceBikes.length} in maintenance` : ''}`,
                    
                    // Reservation hold time from station configuration
                    reservationHoldTimeMinutes: station.reservation_hold_time_minutes || 15,
                    
                    // Counts and availability
                    bikesAvailable: availableBikes.length,
                    freeDocks: freeDocks,
                    
                    // Dock information
                    dockIds: dockIds,
                    freeDockIds: freeDockIds,
                    occupiedDocks: numberOfBikesDocked,
                    
                    // Status flags
                    isEmpty: numberOfBikesDocked === 0,
                    isFull: freeDocks === 0,
                    isActive: station.status === 'active',
                    isOutOfService: station.status === 'out_of_service',
                    
                    // Detailed counts
                    availableBikesCount: availableBikes.length,
                    reservedBikesCount: reservedBikes.length,
                    maintenanceBikesCount: maintenanceBikes.length,
                    onTripBikesCount: 0, // Bikes on trip are not at any station
                    
                    // Bike type counts
                    totalStandardBikes: bikes.filter(b => b.type === 'standard').length,
                    totalEBikes: bikes.filter(b => b.type === 'e-bike').length,
                    dockedStandardBikes: bikes.filter(b => b.type === 'standard' && b.status !== 'on_trip').length,
                    dockedEBikes: bikes.filter(b => b.type === 'e-bike' && b.status !== 'on_trip').length
                };
            });
            
            const results = await Promise.all(stationPromises);
            
            res.json({
                success: true,
                message: `Found ${results.length} station(s) matching "${query}"`,
                stations: results,
                totalResults: results.length,
                searchQuery: query
            });
            
        } catch (error) {
            console.error('Error searching stations:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching stations',
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

    // Reserve a bike - riders only
    app.post('/api/reserve', authenticateUser, requireRider, async (req, res) => {
        try {
            const { stationId, bikeId } = req.body;
            const userId = req.user.id;
            
            if (!stationId || !bikeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID and Bike ID are required'
                });
            }

            // Business Rule: Validate user can make a reservation (no active rental or reservation)
            const validation = await validateUserCanReserve(userId);
            if (!validation.canReserve) {
                return res.status(409).json({
                    success: false,
                    message: validation.message,
                    reason: validation.reason,
                    ...(validation.activeRental && { activeRental: validation.activeRental }),
                    ...(validation.activeReservation && { activeReservation: validation.activeReservation })
                });
            }

            // Check if user already has an active reservation (one per user limit) - redundant check but keeping for safety
            db.get(
                `SELECT * FROM r_bms_bikes 
                 WHERE reserved_by_user_id = ? AND status = 'reserved' 
                 AND (reservation_expiry IS NULL OR reservation_expiry > datetime('now'))`,
                [userId],
                (err, existingReservation) => {
                    if (err) {
                        console.error('Database error checking existing reservations:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Database error checking reservations'
                        });
                    }

                    if (existingReservation) {
                        return res.status(400).json({
                            success: false,
                            message: 'You already have an active reservation',
                            existingReservation: {
                                bikeId: existingReservation.id,
                                stationId: existingReservation.station_id,
                                expiresAt: existingReservation.reservation_expiry
                            }
                        });
                    }

                    // Check if the requested bike is available
                    db.get(
                        `SELECT * FROM r_bms_bikes 
                         WHERE id = ? AND station_id = ? AND status = 'available'`,
                        [bikeId, stationId],
                        (bikeErr, bike) => {
                            if (bikeErr) {
                                console.error('Database error checking bike availability:', bikeErr);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Database error checking bike'
                                });
                            }

                            if (!bike) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Bike not available for reservation'
                                });
                            }

                            // Calculate reservation expiry (15 minutes default)
                            const reservationHoldMinutes = 15;
                            const expiryTime = new Date();
                            expiryTime.setMinutes(expiryTime.getMinutes() + reservationHoldMinutes);

                            // Reserve the bike
                            db.run(
                                `UPDATE r_bms_bikes 
                                 SET status = 'reserved', 
                                     reserved_by_user_id = ?, 
                                     reservation_expiry = ?,
                                     updated_at = CURRENT_TIMESTAMP
                                 WHERE id = ? AND station_id = ?`,
                                [userId, expiryTime.toISOString(), bikeId, stationId],
                                function(updateErr) {
                                    if (updateErr) {
                                        console.error('Error reserving bike:', updateErr);
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to reserve bike'
                                        });
                                    }

                                    // Get station name for response
                                    db.get(
                                        'SELECT name FROM stations WHERE id = ?',
                                        [stationId],
                                        (stationErr, station) => {
                                            const stationName = station ? station.name : 'Unknown Station';
                                            
                                            console.log(`Bike ${bikeId} reserved by user ${userId} at station ${stationId}`);
                                            
                                            // Log reservation activity
                                            logUserActivity(userId, 'reservation', bikeId, stationId, {
                                                bike_type: bike.type === 'electric' ? '⚡ E-Bike' : '🚴 Standard',
                                                station_name: stationName,
                                                expires_at: expiryTime.toISOString()
                                            });
                                            
                                            res.json({
                                                success: true,
                                                message: 'Bike reserved successfully',
                                                reservation: {
                                                    bikeId: bikeId,
                                                    bikeType: bike.type,
                                                    stationId: stationId,
                                                    stationName: stationName,
                                                    reservedAt: new Date().toISOString(),
                                                    expiresAt: expiryTime.toISOString(),
                                                    holdTimeMinutes: reservationHoldMinutes,
                                                    userId: userId
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
            
        } catch (error) {
            console.error('Error reserving bike:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing bike reservation',
                error: error.message
            });
        }
    });

    // Cancel bike reservation - riders only
    app.post('/api/reserve/cancel', authenticateUser, requireRider, (req, res) => {
        try {
            const { stationId, bikeId } = req.body;
            const userId = req.user.id;
            
            if (!stationId || !bikeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID and Bike ID are required'
                });
            }

            // Check if bike exists and is reserved by this user
            db.get(
                `SELECT * FROM r_bms_bikes 
                 WHERE id = ? AND station_id = ? AND status = 'reserved'`,
                [bikeId, stationId],
                (err, bike) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Database error checking reservation'
                        });
                    }

                    if (!bike) {
                        return res.status(404).json({
                            success: false,
                            message: 'Bike not found or not reserved'
                        });
                    }

                    // Check if reservation is still valid and belongs to this user
                    if (bike.reservation_expiry) {
                        const expiryTime = new Date(bike.reservation_expiry);
                        const now = new Date();
                        
                        if (expiryTime < now) {
                            return res.status(400).json({
                                success: false,
                                message: 'Reservation has expired'
                            });
                        }
                    }

                    // Check if the reservation belongs to this user
                    if (bike.reserved_by_user_id && bike.reserved_by_user_id != userId) {
                        return res.status(403).json({
                            success: false,
                            message: 'This reservation does not belong to you'
                        });
                    }

                    // Cancel the reservation - set status back to available and clear expiry
                    db.run(
                        `UPDATE r_bms_bikes 
                         SET status = 'available', reservation_expiry = NULL, reserved_by_user_id = NULL, updated_at = CURRENT_TIMESTAMP
                         WHERE id = ? AND station_id = ?`,
                        [bikeId, stationId],
                        function(updateErr) {
                            if (updateErr) {
                                console.error('Error updating bike status:', updateErr);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to cancel reservation'
                                });
                            }

                            console.log(`Reservation cancelled: Bike ${bikeId} at station ${stationId} by user ${userId}`);
                            
                            // Log cancellation activity
                            logUserActivity(userId, 'reservation_cancelled', bikeId, stationId, {
                                bike_type: bike.type === 'electric' ? '⚡ E-Bike' : '🚴 Standard'
                            });
                            
                            res.json({
                                success: true,
                                message: 'Bike reservation cancelled successfully',
                                bikeId: bikeId,
                                stationId: stationId
                            });
                        }
                    );
                }
            );
            
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Error cancelling bike reservation',
                error: error.message
            });
        }
    });

    // R-BMS-02: Rent a bike (undocking with empty station protection) - riders only
    app.post('/api/rent', authenticateUser, requireRider, async (req, res) => {
        try {
            let { stationId, bikeId, userId } = req.body;

            // Basic presence check
            if (!stationId || !bikeId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID, Bike ID, and User ID are required'
                });
            }

            // Normalize types to strings to avoid strict-equality issues between header and body
            const headerUserId = req.user && req.user.id;
            const normHeaderUserId = headerUserId !== undefined && headerUserId !== null ? String(headerUserId) : null;
            const normBodyUserId = userId !== undefined && userId !== null ? String(userId) : null;

            // Validate ownership - riders can only rent for themselves (compare as strings)
            if (req.user && req.user.role === 'rider' && normHeaderUserId !== normBodyUserId) {
                return res.status(403).json({
                    success: false,
                    message: 'Riders can only rent bikes for themselves',
                    error: 'INSUFFICIENT_PERMISSIONS',
                    details: { headerUserId: normHeaderUserId, bodyUserId: normBodyUserId }
                });
            }

            // Business Rule: Validate user can rent bike (no active rental, or only reserved bike)
            const validationUserId = normBodyUserId || normHeaderUserId;
            const validation = await validateUserCanRent(validationUserId, bikeId);
            if (!validation.canRent) {
                return res.status(409).json({
                    success: false,
                    message: validation.message,
                    reason: validation.reason,
                    ...(validation.activeRental && { activeRental: validation.activeRental }),
                    ...(validation.activeReservation && { activeReservation: validation.activeReservation })
                });
            }

            // Debug: log incoming values to help diagnose mismatches
            console.log('DEBUG /api/rent incoming:', {
                headerUserId: normHeaderUserId,
                bodyUserId: normBodyUserId,
                stationId: stationId,
                bikeId: bikeId,
                types: { stationId: typeof stationId, bikeId: typeof bikeId, userId: typeof userId }
            });

            // Defensive: detect common swap (stationId <-> bikeId) and auto-correct with a warning
            // This helps when older clients or misconfigured servers send swapped values like stationId='BIKE001'
            const looksLikeBike = id => typeof id === 'string' && /^BIKE/i.test(id);
            const looksLikeStation = id => typeof id === 'string' && /^STN/i.test(id);
            if (looksLikeBike(stationId) && looksLikeStation(bikeId)) {
                console.warn('WARN /api/rent: Detected stationId and bikeId appear swapped — auto-correcting. Incoming:', { stationId, bikeId });
                // swap values
                const tmp = stationId;
                stationId = bikeId;
                bikeId = tmp;
            }

            // Ensure userId passed to rental system is normalized string
            const useUserId = normBodyUserId || normHeaderUserId;

            // Use config system instead of BMS manager for all stations
            const result = await rentBikeFromConfig(useUserId, stationId, bikeId);

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
    app.post('/api/return', authenticateUser, requireRider, async (req, res) => {
        try {
            let { stationId, bikeId, userId } = req.body;

            if (!stationId || !bikeId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID, Bike ID, and User ID are required'
                });
            }

            // Normalize user id types
            const headerUserId = req.user && req.user.id;
            const normHeaderUserId = headerUserId !== undefined && headerUserId !== null ? String(headerUserId) : null;
            const normBodyUserId = userId !== undefined && userId !== null ? String(userId) : null;

            // Validate ownership - riders can only return bikes they rented (compare as strings)
            if (req.user && req.user.role === 'rider' && normHeaderUserId !== normBodyUserId) {
                return res.status(403).json({
                    success: false,
                    message: 'Riders can only return their own bikes',
                    error: 'INSUFFICIENT_PERMISSIONS',
                    details: { headerUserId: normHeaderUserId, bodyUserId: normBodyUserId }
                });
            }

            // Debug log
            console.log('DEBUG /api/return incoming:', { headerUserId: normHeaderUserId, bodyUserId: normBodyUserId, stationId, bikeId });

            // Use config system for bike return
            const useUserId = normBodyUserId || normHeaderUserId;
            const result = await returnBikeToConfig(useUserId, bikeId, stationId);

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

/**
 * Rent a bike using the config system (works with all 15 stations)
 */
async function rentBikeFromConfig(userId, stationId, bikeId) {
    return new Promise((resolve) => {
        try {
            // Check if bike exists and is available
            db.get(
                'SELECT * FROM r_bms_bikes WHERE id = ? AND station_id = ?',
                [bikeId, stationId],
                async (err, bike) => {
                    if (err) {
                        console.error('Database error during rent:', err);
                        return resolve({
                            success: false,
                            message: 'Database error during rental'
                        });
                    }

                    if (!bike) {
                        return resolve({
                            success: false,
                            message: `Bike ${bikeId} not found at station ${stationId}`
                        });
                    }

                    // Check if bike is available or reserved by this user
                    if (bike.status === 'available') {
                        // Bike is available for anyone to rent
                    } else if (bike.status === 'reserved' && bike.reserved_by_user_id === parseInt(userId)) {
                        // Bike is reserved by this user, they can rent it
                        console.log(`User ${userId} is renting their reserved bike ${bikeId}`);
                    } else {
                        return resolve({
                            success: false,
                            message: `Bike ${bikeId} is not available (status: ${bike.status})`
                        });
                    }

                    // Update bike status to on_trip and clear reservation
                    db.run(
                        'UPDATE r_bms_bikes SET status = ?, station_id = ?, reserved_by_user_id = ?, reservation_expiry = ? WHERE id = ?',
                        ['on_trip', null, null, null, bikeId],
                        function(updateErr) {
                            if (updateErr) {
                                console.error('Error updating bike status:', updateErr);
                                return resolve({
                                    success: false,
                                    message: 'Failed to update bike status'
                                });
                            }

                            // Create rental record with station info
                            db.run(
                                'INSERT INTO rentals (user_id, bike_id, start_time, status, station_id) VALUES (?, ?, ?, ?, ?)',
                                [userId, bikeId, new Date().toISOString(), 'active', stationId],
                                function(rentalErr) {
                                    if (rentalErr) {
                                        console.error('Error creating rental record:', rentalErr);
                                        // Rollback bike status (restore to original state)
                                        const rollbackStatus = bike.status; // Could be 'available' or 'reserved'
                                        const rollbackReservedBy = bike.reserved_by_user_id;
                                        const rollbackExpiry = bike.reservation_expiry;
                                        db.run('UPDATE r_bms_bikes SET status = ?, station_id = ?, reserved_by_user_id = ?, reservation_expiry = ? WHERE id = ?', 
                                               [rollbackStatus, stationId, rollbackReservedBy, rollbackExpiry, bikeId]);
                                        return resolve({
                                            success: false,
                                            message: 'Failed to create rental record'
                                        });
                                    }

                                    console.log(`SUCCESS: Bike ${bikeId} rented from station ${stationId} by user ${userId}`);

                                    // --- Update in-memory bmsManager state ---
                                    if (bmsManager && bmsManager.stations && bmsManager.bikes) {
                                        const station = bmsManager.stations.get(stationId);
                                        const bikeMem = bmsManager.bikes.get(bikeId);
                                        if (station && bikeMem) {
                                            station.dockedBikes.delete(bikeId);
                                            // Optionally update bike status in memory
                                            bikeMem.status = 'on_trip';
                                        }
                                    }

                                    // Log rental start activity
                                    logUserActivity(userId, 'rental_started', bikeId, stationId, {
                                        bike_type: bike.type === 'electric' ? '⚡ E-Bike' : '🚴 Standard',
                                        pickup_station: stationId
                                    });

                                    resolve({
                                        success: true,
                                        message: `Bike ${bikeId} successfully rented from station ${stationId}`,
                                        rental: {
                                            bikeId,
                                            stationId,
                                            userId,
                                            startTime: new Date().toISOString()
                                        }
                                    });
                                }
                            );
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Error in rentBikeFromConfig:', error);
            resolve({
                success: false,
                message: 'Internal error during rental'
            });
        }
    });
}

/**
 * Return a bike using the config system (works with all 15 stations)
 */
async function returnBikeToConfig(userId, bikeId, stationId) {
    return new Promise((resolve) => {
        try {
            // First, verify user has an active rental for this bike
            // Block docking to out-of-service stations
            if (bmsManager && bmsManager.stations) {
                const station = bmsManager.stations.get(stationId);
                if (station && station.isOutOfService && station.isOutOfService()) {
                    return resolve({
                        success: false,
                        message: `Cannot return bike to station ${stationId} (${station.name}): station is out of service`,
                        operation: 'return_failed_station_oos',
                        stationInfo: station.getStationInfo()
                    });
                }
            }
            db.get(
                'SELECT * FROM rentals WHERE user_id = ? AND bike_id = ? AND status = ?',
                [userId, bikeId, 'active'],
                async (err, rental) => {
                    if (err) {
                        console.error('Database error during return:', err);
                        return resolve({
                            success: false,
                            message: 'Database error during return'
                        });
                    }

                    if (!rental) {
                        return resolve({
                            success: false,
                            message: `No active rental found for bike ${bikeId}`
                        });
                    }

                    // Check if station exists and has space
                    db.get(
                        'SELECT id FROM stations WHERE id = ?',
                        [stationId],
                        (stationErr, station) => {
                            if (stationErr) {
                                console.error('Database error checking station:', stationErr);
                                return resolve({
                                    success: false,
                                    message: 'Database error checking station'
                                });
                            }

                            if (!station) {
                                return resolve({
                                    success: false,
                                    message: `Station ${stationId} not found`
                                });
                            }

                            // Update bike status back to available and assign to station
                            db.run(
                                'UPDATE r_bms_bikes SET status = ?, station_id = ? WHERE id = ?',
                                ['available', stationId, bikeId],
                                function(updateErr) {
                                    if (updateErr) {
                                        console.error('Error updating bike status:', updateErr);
                                        return resolve({
                                            success: false,
                                            message: 'Failed to update bike status'
                                        });
                                    }

                                    // --- Update in-memory bmsManager state ---
                                    if (bmsManager && bmsManager.stations && bmsManager.bikes) {
                                        const station = bmsManager.stations.get(stationId);
                                        const bikeMem = bmsManager.bikes.get(bikeId);
                                        if (station && bikeMem) {
                                            station.dockedBikes.set(bikeId, bikeMem);
                                            bikeMem.status = 'available';
                                        }
                                    }

                                    // Get bike type for billing calculation
                                    db.get(
                                        'SELECT type FROM r_bms_bikes WHERE id = ?',
                                        [bikeId],
                                        (bikeErr, bike) => {
                                            if (bikeErr) {
                                                console.error('Error getting bike type:', bikeErr);
                                                // Continue without billing info
                                            }

                                            const endTime = new Date().toISOString();
                                            let billingInfo = null;
                                            
                                            // Calculate billing if we have bike type
                                            if (bike && bike.type) {
                                                billingInfo = calculateRentalCost(rental.start_time, endTime, bike.type);
                                            }

                                            // End the rental with billing information
                                            const updateQuery = billingInfo ? 
                                                'UPDATE rentals SET status = ?, end_time = ?, total_cost = ? WHERE id = ?' :
                                                'UPDATE rentals SET status = ?, end_time = ? WHERE id = ?';
                                            
                                            const updateParams = billingInfo ? 
                                                ['completed', endTime, billingInfo.totalCost, rental.id] :
                                                ['completed', endTime, rental.id];

                                            db.run(updateQuery, updateParams, function(rentalErr) {
                                                if (rentalErr) {
                                                    console.error('Error ending rental:', rentalErr);
                                                    // Rollback bike status
                                                    db.run('UPDATE r_bms_bikes SET status = ?, station_id = ? WHERE id = ?', 
                                                           ['on_trip', null, bikeId]);
                                                    return resolve({
                                                        success: false,
                                                        message: 'Failed to end rental'
                                                    });
                                                }

                                                const duration = Date.now() - new Date(rental.start_time).getTime();
                                                console.log(`SUCCESS: Bike ${bikeId} returned to station ${stationId} by user ${userId}`);
                                                
                                                // Log rental completion activity
                                                const durationMinutes = Math.ceil(duration / (1000 * 60));
                                                const durationHours = Math.floor(durationMinutes / 60);
                                                const durationMins = durationMinutes % 60;
                                                const durationText = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins}m`;
                                                
                                                logUserActivity(userId, 'rental_completed', bikeId, stationId, {
                                                    bike_type: bike.type === 'electric' ? '⚡ E-Bike' : '🚴 Standard',
                                                    bike_type_raw: bike.type, // Add raw type for frontend logic
                                                    return_station_id: stationId,
                                                    pickup_station_id: rental.station_id,
                                                    duration: durationText,
                                                    duration_minutes: durationMinutes, // Add duration in minutes
                                                    cost: billingInfo ? billingInfo.totalCost : 0
                                                });
                                                
                                                const response = {
                                                    success: true,
                                                    message: `Bike ${bikeId} successfully returned to station ${stationId}`,
                                                    return: {
                                                        bikeId,
                                                        stationId,
                                                        userId,
                                                        endTime,
                                                        duration
                                                    }
                                                };

                                                // Add billing info to response if available
                                                if (billingInfo) {
                                                    response.billing = {
                                                        totalCost: billingInfo.totalCost,
                                                        durationMinutes: billingInfo.durationMinutes,
                                                        ratePerMinute: billingInfo.ratePerMinute,
                                                        bikeType: bike.type
                                                    };
                                                    response.message += ` - Total charge: $${billingInfo.totalCost.toFixed(2)} for ${billingInfo.durationMinutes} minutes`;
                                                }

                                                resolve(response);
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Error in returnBikeToConfig:', error);
            resolve({
                success: false,
                message: 'Internal error during return'
            });
        }
    });
}

/**
 * Clean up orphaned reservations for a user
 * This handles cases where reservations exist in stations config but the user account was recreated
 */
async function cleanupOrphanedReservations(userId, username) {
    try {
        const configPath = './config/stations-config.json';
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        let cleanupCount = 0;
        
        // Check all bikes in stations config for reservations by this username
        for (let station of config.stations) {
            for (let bike of station.bikes) {
                if (bike.reservedBy === username) {
                    // Check if this reservation exists in the database
                    const activeReservation = await new Promise((resolve, reject) => {
                        db.get(
                            'SELECT * FROM reservations WHERE user_id = ? AND bike_id = ? AND status = "active"',
                            [userId, bike.id],
                            (err, row) => err ? reject(err) : resolve(row)
                        );
                    });
                    
                    // If no active reservation found in database, clean up the config
                    if (!activeReservation) {
                        console.log(`Cleaning up orphaned reservation for bike ${bike.id} by user ${username}`);
                        delete bike.reservedBy;
                        delete bike.reservedAt;
                        delete bike.reservationExpiry;
                        bike.status = 'available';
                        cleanupCount++;
                    }
                }
            }
        }
        
        if (cleanupCount > 0) {
            // Save the cleaned config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`Cleaned up ${cleanupCount} orphaned reservations for user ${username}`);
        }
    } catch (error) {
        console.error('Error in cleanupOrphanedReservations:', error);
    }
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

// Notifications: Get empty/full docking station notifications for user profile
app.get('/api/notifications/stations', (req, res) => {
    try {
        if (!bmsManager || typeof bmsManager.listAllStations !== 'function') {
            return res.status(500).json({
                success: false,
                message: 'BMS Manager not initialized',
            });
        }
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
        res.status(500).json({
            success: false,
            message: 'Error retrieving station notifications',
            error: error.message
        });
    }
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