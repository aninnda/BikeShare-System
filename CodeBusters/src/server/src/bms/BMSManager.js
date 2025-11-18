/**
 * BMS (Bike Management System) Manager
 * Coordinates bike and station operations according to R-BMS-02 requirements
 * 
 * This manager class handles:
 * - Station management and bike fleet coordination
 * - Enforcing R-BMS-02: Prevent undocking from empty stations and docking to full stations
 * - Bike reservation and rental operations
 * - System-wide state management
 * - Flex Dollars rewards for returning bikes to understocked stations
 */

const Bike = require('./Bike');
const Station = require('./Station');
const { BMS_STATES, BMS_OPERATIONS, STATION_CONFIG, FLEX_DOLLARS_CONFIG } = require('../../config/constants');

class BMSManager {
    constructor(flexDollarsService = null) {
        this.stations = new Map(); // stationId -> Station object
        this.bikes = new Map(); // bikeId -> Bike object
        this.activeRentals = new Map(); // userId -> rental info
        this.flexDollarsService = flexDollarsService; // Optional service for flex dollars
        this.systemStats = {
            totalOperations: 0,
            successfulDocks: 0,
            failedDocks: 0,
            successfulUndocks: 0,
            failedUndocks: 0,
            blockedOperations: 0,
            flexDollarsAwarded: 0
        };
        
        console.log('BMS Manager initialized with sanity checking enabled');
        if (flexDollarsService) {
            console.log('Flex Dollars Service enabled - riders will receive rewards for returning bikes to understocked stations');
        }

    }

    /**
     * Set the FlexDollarsService for awarding flex dollars
     * Called during server initialization
     */
    setFlexDollarsService(flexDollarsService) {
        this.flexDollarsService = flexDollarsService;
        console.log('Flex Dollars Service has been set on BMSManager');
    }

    /**
     * Sanity checking: validate entire system state
     */
    validateSystemState() {
        const errors = [];
        let totalDockedBikes = 0;
        let totalRentedBikes = this.activeRentals.size;

        // Validate all stations
        for (const [stationId, station] of this.stations) {
            const stationValidation = station.validateState();
            if (!stationValidation.isValid) {
                errors.push(`Station ${stationId}: ${stationValidation.errors.join(', ')}`);
            }
            totalDockedBikes += station.dockedBikes.size;
        }

        // System-wide consistency checks
        const totalBikes = this.bikes.size;
        const accountedBikes = totalDockedBikes + totalRentedBikes;

        if (accountedBikes !== totalBikes) {
            errors.push(`Bike count mismatch: ${accountedBikes} accounted vs ${totalBikes} total`);
        }

        if (totalDockedBikes < 0) {
            errors.push('System has negative docked bike count');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            stats: {
                totalBikes,
                totalDockedBikes,
                totalRentedBikes,
                accountedBikes
            }
        };
    }

    /**
     * Add a new station to the system
     */
    addStation(stationId, capacity = STATION_CONFIG.DEFAULT_CAPACITY, location = null) {
        // Sanity check: validate input
        if (!stationId || typeof stationId !== 'string' || stationId.trim() === '') {
            return {
                success: false,
                message: 'Station ID must be a non-empty string'
            };
        }

        if (this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} already exists`
            };
        }

        const station = new Station(stationId, capacity, location);
        this.stations.set(stationId, station);

        return {
            success: true,
            message: `Station ${stationId} added successfully`,
            station: station.getStationInfo()
        };
    }

    /**
     * Add a new bike to the system and dock it at a station
     */
    addBike(bikeId, stationId, type = 'standard') {
        // Sanity check: validate input
        if (!bikeId || typeof bikeId !== 'string' || bikeId.trim() === '') {
            return {
                success: false,
                message: 'Bike ID must be a non-empty string'
            };
        }

        if (!stationId || typeof stationId !== 'string' || stationId.trim() === '') {
            return {
                success: false,
                message: 'Station ID must be a non-empty string'
            };
        }

        if (this.bikes.has(bikeId)) {
            return {
                success: false,
                message: `Bike ${bikeId} already exists`
            };
        }

        if (!this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} does not exist`
            };
        }

        const bike = new Bike(bikeId, type);
        const station = this.stations.get(stationId);
        
        // Try to return the new bike to station (dock it)
        const dockResult = station.returnBike(bike);
        
        if (dockResult.success) {
            this.bikes.set(bikeId, bike);
            this.systemStats.totalOperations++;
            this.systemStats.successfulDocks++;
        }

        return {
            success: dockResult.success,
            message: `Bike ${bikeId} ${dockResult.success ? 'added and docked' : 'could not be docked'} at station ${stationId}`,
            bike: bike.getInfo(),
            dockResult: dockResult
        };
    }

    /**
     * R-BMS-02: Rent a bike (undock from station)
     * Prevents undocking from empty stations
     */
    rentBike(userId, stationId, bikeId = null) {
        this.systemStats.totalOperations++;

        // Validation: Check if station exists
        if (!this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} does not exist`
            };
        }

        const station = this.stations.get(stationId);

        // If no specific bike requested, get a random available one
        if (!bikeId) {
            const availableBike = station.getRandomAvailableBike();
            if (!availableBike) {
                this.systemStats.failedUndocks++;
                this.systemStats.blockedOperations++;
                return {
                    success: false,
                    operation: BMS_OPERATIONS.UNDOCK_FAILED_EMPTY,
                    message: `No bikes available at station ${stationId}`,
                    stationInfo: station.getStationInfo()
                };
            }
            bikeId = availableBike.id;
        }

        // Business Rule: Checkout bike (with empty station prevention)
        const undockResult = station.checkoutBike(bikeId, userId);

        // Update statistics
        if (undockResult.success) {
            this.systemStats.successfulUndocks++;
            
            // Track the rental
            this.activeRentals.set(userId, {
                userId: userId,
                bikeId: bikeId,
                stationId: stationId,
                startTime: new Date(),
                status: 'active'
            });
        } else {
            this.systemStats.failedUndocks++;
            if (undockResult.operation === BMS_OPERATIONS.UNDOCK_FAILED_EMPTY) {
                this.systemStats.blockedOperations++;
            }
        }

        return {
            success: undockResult.success,
            operation: undockResult.operation,
            message: undockResult.message,
            rental: undockResult.success ? this.activeRentals.get(userId) : null,
            stationInfo: undockResult.stationInfo
        };
    }

    /**
     * R-BMS-02: Return a bike (dock to station)
     * Prevents docking to full stations
     * DM-03: Award flex dollars if station is below 25% occupancy
     */
    async returnBike(userId, bikeId, stationId) {
        this.systemStats.totalOperations++;

        // Validation: Check if user has active rental
        if (!this.activeRentals.has(userId)) {
            return {
                success: false,
                message: `User ${userId} has no active rental`
            };
        }

        const rental = this.activeRentals.get(userId);
        if (rental.bikeId !== bikeId) {
            return {
                success: false,
                message: `User ${userId} did not rent bike ${bikeId}`
            };
        }

        // Validation: Check if station exists
        if (!this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} does not exist`
            };
        }

        const station = this.stations.get(stationId);
        const bike = this.bikes.get(bikeId);

        // Business Rule: Return bike (with full station prevention)
        const dockResult = station.returnBike(bike);

        // Update statistics
        if (dockResult.success) {
            this.systemStats.successfulDocks++;
            
            // Complete the rental
            rental.endTime = new Date();
            rental.returnStationId = stationId;
            rental.status = 'completed';
            this.activeRentals.delete(userId);

            // Business Rule: DM-03, DM-04 - Award flex dollars for returning to understocked stations
            // Check if station is below minimum occupancy (25%) after the return
            if (this.flexDollarsService && dockResult.stationInfo) {
                const stationInfo = dockResult.stationInfo;
                const occupiedDocks = stationInfo.numberOfBikesDocked;
                const totalCapacity = stationInfo.capacity;
                
                // Check if station is now below 25% capacity
                if (this.flexDollarsService.isBelowMinimumOccupancy(occupiedDocks, totalCapacity)) {
                    try {
                        const rewardAmount = this.flexDollarsService.getRewardAmount();
                        const awardResult = await this.flexDollarsService.awardFlexDollars(
                            userId,
                            rewardAmount,
                            `Bike returned to ${station.name} (${occupiedDocks}/${totalCapacity} capacity)`,
                            null, // relatedRentalId can be added if needed
                            stationId
                        );
                        
                        if (awardResult.success) {
                            this.systemStats.flexDollarsAwarded++;
                            dockResult.flexDollarsAwarded = {
                                amount: rewardAmount,
                                reason: `Station below 25% capacity (${Math.round((occupiedDocks / totalCapacity) * 100)}% occupied)`,
                                newBalance: awardResult.newBalance
                            };
                            console.log(`✅ Flex dollars awarded: $${rewardAmount.toFixed(2)} to user ${userId} for understocked station return`);
                        }
                    } catch (error) {
                        console.error(`Error awarding flex dollars: ${error.message}`);
                        // Don't fail the return due to flex dollars error, just log it
                    }
                }
            }
        } else {
            this.systemStats.failedDocks++;
            if (dockResult.operation === BMS_OPERATIONS.DOCK_FAILED_FULL) {
                this.systemStats.blockedOperations++;
            }
        }

        return {
            success: dockResult.success,
            operation: dockResult.operation,
            message: dockResult.message,
            rental: rental,
            stationInfo: dockResult.stationInfo
        };
    }

    /**
     * Get system overview
     */
    getSystemOverview() {
        const stationSummary = Array.from(this.stations.values()).map(station => ({
            id: station.id,
            capacity: station.capacity,
            occupied: station.dockedBikes.size,
            available: station.getFreeDocks(),
            status: station.status,
            isEmpty: station.isEmpty(),
            isFull: station.isFull()
        }));

        return {
            totalStations: this.stations.size,
            totalBikes: this.bikes.size,
            activeRentals: this.activeRentals.size,
            stations: stationSummary,
            systemStats: this.systemStats,
            r_bms_02_compliance: {
                description: "Prevents undocking from empty stations and docking to full stations",
                blockedOperations: this.systemStats.blockedOperations,
                successRate: this.calculateSuccessRate()
            }
        };
    }

    /**
     * Calculate system success rate
     */
    calculateSuccessRate() {
        const totalOps = this.systemStats.totalOperations;
        if (totalOps === 0) return 100;
        
        const successfulOps = this.systemStats.successfulDocks + this.systemStats.successfulUndocks;
        return Math.round((successfulOps / totalOps) * 100);
    }

    /**
     * Get specific station information
     */
    getStationInfo(stationId) {
        if (!this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} not found`
            };
        }

        return {
            success: true,
            station: this.stations.get(stationId).getStationInfo()
        };
    }

    /**
     * List all stations with their current status
     */
    listAllStations() {
        return Array.from(this.stations.values()).map(station => station.getStationInfo());
    }

    /**
     * Business Rule: Manual move - operator moves bike A→B (atomic decrement/increment)
     */
    manualMoveBike(bikeId, fromStationId, toStationId, operatorId) {
        this.systemStats.totalOperations++;

        // Validation: Check if both stations exist
        if (!this.stations.has(fromStationId)) {
            return {
                success: false,
                operation: BMS_OPERATIONS.MANUAL_MOVE_FAILED,
                message: `Source station ${fromStationId} does not exist`
            };
        }

        if (!this.stations.has(toStationId)) {
            return {
                success: false,
                operation: BMS_OPERATIONS.MANUAL_MOVE_FAILED,
                message: `Destination station ${toStationId} does not exist`
            };
        }

        const fromStation = this.stations.get(fromStationId);
        const toStation = this.stations.get(toStationId);
        const bike = this.bikes.get(bikeId);

        if (!bike) {
            return {
                success: false,
                operation: BMS_OPERATIONS.MANUAL_MOVE_FAILED,
                message: `Bike ${bikeId} does not exist`
            };
        }

        // Atomic operation: decrement from source, increment to destination
        const checkoutResult = fromStation.checkoutBike(bikeId, operatorId);
        
        if (!checkoutResult.success) {
            return {
                success: false,
                operation: BMS_OPERATIONS.MANUAL_MOVE_FAILED,
                message: `Failed to checkout bike from ${fromStationId}: ${checkoutResult.message}`,
                fromStationInfo: fromStation.getStationInfo()
            };
        }

        // Immediately return to destination station
        const returnResult = toStation.returnBike(bike);
        
        if (!returnResult.success) {
            // Rollback: put bike back to original station
            const rollbackResult = fromStation.returnBike(bike);
            return {
                success: false,
                operation: BMS_OPERATIONS.MANUAL_MOVE_FAILED,
                message: `Failed to dock bike at ${toStationId}: ${returnResult.message}. Rollback ${rollbackResult.success ? 'successful' : 'failed'}`,
                toStationInfo: toStation.getStationInfo(),
                rollback: rollbackResult.success
            };
        }

        console.log(`MANUAL MOVE: Bike ${bikeId} moved from ${fromStationId} to ${toStationId} by operator ${operatorId}`);
        
        return {
            success: true,
            operation: BMS_OPERATIONS.MANUAL_MOVE_SUCCESS,
            message: `Bike ${bikeId} successfully moved from ${fromStationId} to ${toStationId}`,
            fromStationInfo: fromStation.getStationInfo(),
            toStationInfo: toStation.getStationInfo(),
            operatorId: operatorId
        };
    }

    /**
     * Emergency: Set station maintenance mode
     */
    setStationMaintenance(stationId, isOutOfService = true) {
        if (!this.stations.has(stationId)) {
            return {
                success: false,
                message: `Station ${stationId} not found`
            };
        }

        const station = this.stations.get(stationId);
        station.setMaintenance(isOutOfService);
        
        return {
            success: true,
            message: `Station ${stationId} ${isOutOfService ? 'taken out of service' : 'returned to service'}`,
            station: station.getStationInfo()
        };
    }
}

module.exports = BMSManager;