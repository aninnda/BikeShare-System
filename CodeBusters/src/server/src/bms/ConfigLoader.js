const fs = require('fs');
const path = require('path');

/**
 * Configuration Loader for R-BMS-01
 * Loads bike stations and bikes from configuration files
 */
class ConfigLoader {
    constructor() {
        this.configPath = path.join(__dirname, '../../config/stations-config.json');
        this.config = null;
    }

    /**
     * Load configuration from JSON file
     * @returns {Promise<Object>} Configuration object
     */
    async loadConfig() {
        try {
            console.log('📁 Loading configuration from:', this.configPath);
            
            if (!fs.existsSync(this.configPath)) {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }

            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            
            console.log('✅ Configuration loaded successfully');
            console.log(`📊 Found ${this.config.stations.length} stations`);
            
            // Validate configuration structure
            this.validateConfig();
            
            return this.config;
        } catch (error) {
            console.error('❌ Error loading configuration:', error.message);
            throw error;
        }
    }

    /**
     * Validate configuration structure
     */
    validateConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }

        // Check required fields
        const requiredFields = ['version', 'stations'];
        for (const field of requiredFields) {
            if (!this.config[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate each station
        for (const station of this.config.stations) {
            this.validateStation(station);
        }

        console.log('✅ Configuration validation passed');
    }

    /**
     * Validate individual station structure
     */
    validateStation(station) {
        const requiredStationFields = [
            'id', 'name', 'status', 'latitude', 'longitude', 
            'address', 'capacity', 'reservationHoldTimeMinutes', 'bikes'
        ];

        for (const field of requiredStationFields) {
            if (station[field] === undefined) {
                throw new Error(`Station ${station.id || 'unknown'} missing field: ${field}`);
            }
        }

        // Validate status - R-BMS-01 requirements
        const validStatuses = ['empty', 'occupied', 'full', 'out_of_service'];
        if (!validStatuses.includes(station.status)) {
            throw new Error(`Invalid station status: ${station.status}. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Validate coordinates
        if (station.latitude < -90 || station.latitude > 90) {
            throw new Error(`Invalid latitude for station ${station.id}: ${station.latitude}`);
        }
        if (station.longitude < -180 || station.longitude > 180) {
            throw new Error(`Invalid longitude for station ${station.id}: ${station.longitude}`);
        }

        // Validate bikes
        for (const bike of station.bikes) {
            this.validateBike(bike, station.id);
        }
    }

    /**
     * Validate individual bike structure
     */
    validateBike(bike, stationId) {
        const requiredBikeFields = ['id', 'type', 'status'];
        
        for (const field of requiredBikeFields) {
            if (!bike[field]) {
                throw new Error(`Bike in station ${stationId} missing field: ${field}`);
            }
        }

        // Validate bike type
        const validTypes = ['standard', 'e-bike'];
        if (!validTypes.includes(bike.type)) {
            throw new Error(`Invalid bike type: ${bike.type}`);
        }

        // Validate bike status
        const validStatuses = ['available', 'reserved', 'on_trip', 'maintenance'];
        if (!validStatuses.includes(bike.status)) {
            throw new Error(`Invalid bike status: ${bike.status}`);
        }
    }

    /**
     * Get all stations from config
     * @returns {Array} Array of station objects
     */
    getStations() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config.stations;
    }

    /**
     * Get all bikes from all stations
     * @returns {Array} Array of bike objects with station info
     */
    getAllBikes() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }

        const allBikes = [];
        for (const station of this.config.stations) {
            for (const bike of station.bikes) {
                allBikes.push({
                    ...bike,
                    stationId: station.id,
                    stationName: station.name
                });
            }
        }
        return allBikes;
    }

    /**
     * Get station by ID
     * @param {string} stationId 
     * @returns {Object|null} Station object or null if not found
     */
    getStationById(stationId) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config.stations.find(station => station.id === stationId) || null;
    }

    /**
     * Get configuration summary
     * @returns {Object} Summary statistics
     */
    getSummary() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }

        const summary = {
            version: this.config.version,
            totalStations: this.config.stations.length,
            activeStations: 0,
            outOfServiceStations: 0,
            totalBikes: 0,
            availableBikes: 0,
            reservedBikes: 0,
            onTripBikes: 0,
            maintenanceBikes: 0,
            standardBikes: 0,
            eBikes: 0
        };

        for (const station of this.config.stations) {
            // Station status counts
            if (station.status === 'active') summary.activeStations++;
            if (station.status === 'out_of_service') summary.outOfServiceStations++;

            // Bike counts
            for (const bike of station.bikes) {
                summary.totalBikes++;
                
                // Status counts
                if (bike.status === 'available') summary.availableBikes++;
                if (bike.status === 'reserved') summary.reservedBikes++;
                if (bike.status === 'on_trip') summary.onTripBikes++;
                if (bike.status === 'maintenance') summary.maintenanceBikes++;

                // Type counts
                if (bike.type === 'standard') summary.standardBikes++;
                if (bike.type === 'e-bike') summary.eBikes++;
            }
        }

        return summary;
    }
}

module.exports = ConfigLoader;