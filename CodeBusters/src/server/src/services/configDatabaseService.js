const ConfigLoader = require('../bms/ConfigLoader');
const Station = require('../bms/Station');
const Bike = require('../bms/Bike');

/**
 * Database Integration Service for R-BMS-01
 * Handles integration between config → database → system
 */
class ConfigDatabaseService {
    constructor(database) {
        this.db = database;
        this.configLoader = new ConfigLoader();
        this.stations = new Map();
        this.bikes = new Map();
    }

    /**
     * Initialize system from configuration file
     * R-BMS-01: Load configuration file including docking stations and bikes
     */
    async initializeFromConfig() {
        try {
            console.log('🚀 Initializing BMS from configuration file...');
            
            // Load configuration
            const config = await this.configLoader.loadConfig();
            
            // Create database tables if they don't exist
            await this.createTables();
            
            // Clear existing data (for fresh load)
            await this.clearExistingData();
            
            // Load stations and bikes from config
            await this.loadStationsFromConfig(config.stations);
            await this.loadBikesFromConfig(config.stations);
            
            // Save to database
            await this.saveToDatabase();
            
            console.log('✅ BMS initialization complete!');
            return this.getSummary();
            
        } catch (error) {
            console.error('❌ Failed to initialize from config:', error.message);
            throw error;
        }
    }

    /**
     * Create necessary database tables
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            // First, check if we need to migrate existing bikes table
            this.db.get("PRAGMA table_info(bikes)", (err, row) => {
                if (err && !err.message.includes('no such table')) {
                    reject(err);
                    return;
                }

                const queries = [
                    `CREATE TABLE IF NOT EXISTS stations (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        status TEXT NOT NULL,
                        latitude REAL,
                        longitude REAL,
                        address TEXT,
                        capacity INTEGER NOT NULL,
                        reservation_hold_time_minutes INTEGER DEFAULT 15,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`,
                    
                    // Drop and recreate bikes table with proper schema for R-BMS-01
                    `DROP TABLE IF EXISTS r_bms_bikes`,
                    `CREATE TABLE IF NOT EXISTS r_bms_bikes (
                        id TEXT PRIMARY KEY,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        station_id TEXT,
                        reservation_expiry DATETIME,
                        reserved_by_user_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (station_id) REFERENCES stations (id)
                    )`
                ];

                let completed = 0;
                queries.forEach(query => {
                    this.db.run(query, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === queries.length) {
                            console.log('✅ Database tables created/verified (R-BMS-01 schema)');
                            resolve();
                        }
                    });
                });
            });
        });
    }

    /**
     * Clear existing data for fresh load
     */
    async clearExistingData() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM r_bms_bikes', (err) => {
                if (err && !err.message.includes('no such table')) {
                    reject(err);
                    return;
                }
                
                this.db.run('DELETE FROM stations', (err) => {
                    if (err && !err.message.includes('no such table')) {
                        reject(err);
                        return;
                    }
                    
                    console.log('🗑️  Cleared existing R-BMS-01 data');
                    resolve();
                });
            });
        });
    }

    /**
     * Load stations from configuration
     */
    async loadStationsFromConfig(stationsConfig) {
        console.log('📍 Loading stations from configuration...');
        
        for (const stationData of stationsConfig) {
            const station = new Station(stationData.id, stationData.capacity, {
                name: stationData.name,
                status: stationData.status,
                latitude: stationData.latitude,
                longitude: stationData.longitude,
                address: stationData.address,
                reservationHoldTimeMinutes: stationData.reservationHoldTimeMinutes
            });
            
            this.stations.set(station.id, station);
            console.log(`  ✓ Station ${station.id}: ${station.name}`);
        }
        
        console.log(`✅ Loaded ${this.stations.size} stations`);
    }

    /**
     * Load bikes from configuration
     */
    async loadBikesFromConfig(stationsConfig) {
        console.log('🚲 Loading bikes from configuration...');
        
        let bikeCount = 0;
        
        for (const stationData of stationsConfig) {
            const station = this.stations.get(stationData.id);
            
            for (const bikeData of stationData.bikes) {
                const bike = new Bike(bikeData.id, bikeData.type);
                bike.status = bikeData.status;
                
                // Handle reservation expiry
                if (bikeData.reservationExpiry) {
                    bike.reservationExpiry = new Date(bikeData.reservationExpiry);
                }
                
                this.bikes.set(bike.id, bike);
                
                // Dock the bike to the station if it's available
                if (bike.status === 'available' && station) {
                    station.dockedBikes.set(bike.id, bike);
                }
                
                bikeCount++;
                console.log(`  ✓ Bike ${bike.id} (${bike.type}) - ${bike.status}`);
            }
        }
        
        console.log(`✅ Loaded ${bikeCount} bikes`);
    }

    /**
     * Save loaded data to database
     */
    async saveToDatabase() {
        console.log('💾 Saving data to database...');
        
        // Save stations
        for (const [stationId, station] of this.stations) {
            await this.saveStationToDb(station);
        }
        
        // Save bikes
        for (const [bikeId, bike] of this.bikes) {
            await this.saveBikeToDb(bike);
        }
        
        console.log('✅ Data saved to database');
    }

    /**
     * Save individual station to database
     */
    async saveStationToDb(station) {
        return new Promise((resolve, reject) => {
            const query = `INSERT OR REPLACE INTO stations 
                          (id, name, status, latitude, longitude, address, capacity, reservation_hold_time_minutes) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const params = [
                station.id,
                station.name,
                station.status,
                station.latitude,
                station.longitude,
                station.address,
                station.capacity,
                station.reservationHoldTimeMinutes
            ];
            
            this.db.run(query, params, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Save individual bike to database
     */
    async saveBikeToDb(bike) {
        return new Promise((resolve, reject) => {
            // Find which station this bike belongs to
            let stationId = null;
            for (const [sId, station] of this.stations) {
                if (station.dockedBikes.has(bike.id)) {
                    stationId = sId;
                    break;
                }
            }
            
            const query = `INSERT OR REPLACE INTO r_bms_bikes 
                          (id, type, status, station_id, reservation_expiry) 
                          VALUES (?, ?, ?, ?, ?)`;
            
            const params = [
                bike.id,
                bike.type,
                bike.status,
                stationId,
                bike.reservationExpiry ? bike.reservationExpiry.toISOString() : null
            ];
            
            this.db.run(query, params, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Get all stations for map display
     */
    getAllStations() {
        const stationsArray = [];
        for (const [stationId, station] of this.stations) {
            stationsArray.push(station.getStationInfo());
        }
        return stationsArray;
    }

    /**
     * Get all bikes for map display
     */
    getAllBikes() {
        const bikesArray = [];
        for (const [bikeId, bike] of this.bikes) {
            // Find which station this bike belongs to
            let stationInfo = null;
            for (const [sId, station] of this.stations) {
                if (station.dockedBikes.has(bike.id)) {
                    stationInfo = {
                        stationId: sId,
                        stationName: station.name,
                        latitude: station.latitude,
                        longitude: station.longitude
                    };
                    break;
                }
            }
            
            bikesArray.push({
                ...bike.getInfo(),
                station: stationInfo
            });
        }
        return bikesArray;
    }

    /**
     * Get system summary
     */
    getSummary() {
        const configSummary = this.configLoader.getSummary();
        
        return {
            ...configSummary,
            stations: this.getAllStations(),
            bikes: this.getAllBikes(),
            loadedAt: new Date().toISOString()
        };
    }

    /**
     * Get station by ID
     */
    getStation(stationId) {
        return this.stations.get(stationId);
    }

    /**
     * Get bike by ID
     */
    getBike(bikeId) {
        return this.bikes.get(bikeId);
    }
}

module.exports = ConfigDatabaseService;