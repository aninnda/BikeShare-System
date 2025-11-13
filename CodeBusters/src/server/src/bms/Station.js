/**
 * Station/Dock Management Class
 * Implements Business Rules:
 * - Occupancy accounting: bikesAvailable == count(occupied docks); freeDocks == capacity − bikesAvailable
 * - Checkout: choose available bike → transition to on_trip; decrement count
 * - Return: place bike into any free dock → transition to available; increment count  
 * - Manual move: operator moves bike A→B (atomic decrement/increment)
 * - Station status: active | out_of_service (OOS blocks checkout/return)
 * - Reservation: soft hold with expiresAfterMinutes
 */

const { BMS_STATES, STATION_CONFIG, BMS_OPERATIONS, OCCUPANCY_RULES } = require('../../config/constants');

class Station {
    constructor(id, capacity = STATION_CONFIG.DEFAULT_CAPACITY, options = {}) {
        // Sanity check: validate input
        if (!id || typeof id !== 'string') {
            throw new Error('Station ID must be a non-empty string');
        }
        if (typeof capacity !== 'number' || capacity < 1) {
            throw new Error('Station capacity must be a positive number');
        }

        this.id = id;
        this.name = options.name || `Station ${id}`;
        this.capacity = Math.max(STATION_CONFIG.MIN_CAPACITY, 
                                Math.min(capacity, STATION_CONFIG.MAX_CAPACITY));
        
        // R-BMS-01 Enhanced location data
        this.latitude = options.latitude || null;
        this.longitude = options.longitude || null;
        this.address = options.address || null;
        
        // Legacy location support
        this.location = options.location || (this.latitude && this.longitude ? 
            `${this.latitude},${this.longitude}` : null);
            
        this.status = options.status || BMS_STATES.STATION.ACTIVE; // Business Rule: Station status active | out_of_service
        this.dockedBikes = new Map(); // bikeId -> bike object (occupied docks)
        this.reservations = new Map(); // userId -> reservation info (soft holds)
        
        // R-BMS-01 Reservation hold time
        this.reservationHoldTimeMinutes = options.reservationHoldTimeMinutes || 15;
        
        this.createdAt = new Date();
        this.updatedAt = new Date();
        
        console.log(`Station ${this.id} (${this.name}) initialized with capacity ${this.capacity}, status: ${this.status}`);
    }

    /**
     * Get current station information with occupancy accounting (R-BMS-01 Enhanced)
     * Business Rule: bikesAvailable == count(occupied docks); freeDocks == capacity − bikesAvailable
     */
    getStationInfo() {
        const bikesAvailable = this.getBikesAvailable(); // count(occupied docks)
        const freeDocks = this.getFreeDocks(); // capacity - bikesAvailable
        
        return {
            // R-BMS-01 Required Fields
            id: this.id,
            name: this.name,
            status: this.status,
            latitude: this.latitude,
            longitude: this.longitude,
            address: this.address,
            capacity: this.capacity,
            numberOfBikesDocked: this.dockedBikes.size,
            bikes: this.getDockedBikesList(), // List of bikes docked
            reservationHoldTimeMinutes: this.reservationHoldTimeMinutes,
            
            // Legacy location support
            location: this.location,
            
            // Occupancy Accounting (Business Rules)
            bikesAvailable: bikesAvailable,        // == count(occupied docks)
            freeDocks: freeDocks,                 // == capacity − bikesAvailable
            occupiedDocks: this.dockedBikes.size, // Raw count of occupied docks
            
            // Status Checks
            isEmpty: this.isEmpty(),
            isFull: this.isFull(),
            isActive: this.isActive(),
            isOutOfService: this.isOutOfService(),
            
            // Additional Info
            dockedBikeIds: Array.from(this.dockedBikes.keys()),
            // Generate dock identifiers for this station (e.g., STN001-D01)
            dockIds: Array.from({ length: this.capacity }, (_, i) => `${this.id}-D${String(i + 1).padStart(2, '0')}`),
            // Free dock IDs are those indexes not currently occupied. We map occupied docks to the first N dockIds deterministically.
            freeDockIds: Array.from({ length: Math.max(0, this.getFreeDocks()) }, (_, i) => {
                const occupied = this.dockedBikes.size;
                return `${this.id}-D${String(occupied + i + 1).padStart(2, '0')}`;
            }),
            activeReservations: this.getActiveReservations().length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Get list of docked bikes with their information (R-BMS-01)
     */
    getDockedBikesList() {
        const bikes = [];
        for (const [bikeId, bike] of this.dockedBikes) {
            bikes.push({
                id: bike.id,
                status: bike.status,
                type: bike.type,
                reservationExpiry: bike.reservationExpiry || null
            });
        }
        return bikes;
    }

    /**
     * Business Rule: bikesAvailable == count(occupied docks)
     */
    getBikesAvailable() {
        return this.dockedBikes.size; // count of occupied docks
    }

    /**
     * Business Rule: freeDocks == capacity − bikesAvailable
     */
    getFreeDocks() {
        return this.capacity - this.getBikesAvailable();
    }

    /**
     * Check if station is empty (no bikes available for checkout)
     */
    isEmpty() {
        return this.dockedBikes.size === 0;
    }

    /**
     * Check if station is full (no slots available for docking)
     */
    isFull() {
        return this.dockedBikes.size >= this.capacity;
    }

    /**
     * Business Rule: Station status active | out_of_service
     */
    isActive() {
        return this.status === BMS_STATES.STATION.ACTIVE;
    }

    /**
     * Business Rule: OOS blocks checkout/return
     */
    isOutOfService() {
        return this.status === BMS_STATES.STATION.OUT_OF_SERVICE;
    }

    /**
     * Check if station is operational (legacy method)
     */
    isOperational() {
        return this.isActive();
    }

    /**
     * Sanity checking: validate station state consistency
     */
    validateState() {
        const errors = [];

        // Check for negative bike counts
        if (this.dockedBikes.size < 0) {
            errors.push('Negative bike count detected');
        }

        // Check for over-capacity
        if (this.dockedBikes.size > this.capacity) {
            errors.push(`Over-capacity: ${this.dockedBikes.size}/${this.capacity}`);
        }

        // Check free docks calculation
        if (this.getFreeDocks() < 0) {
            errors.push('Negative free dock count');
        }

        // Check occupancy accounting formula
        if (this.getBikesAvailable() !== this.dockedBikes.size) {
            errors.push('Occupancy accounting mismatch');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanity checking: safe bike addition with validation
     */
    safeDockBike(bike) {
        // Pre-operation validation
        const preValidation = this.validateState();
        if (!preValidation.isValid) {
            throw new Error(`Station state invalid before docking: ${preValidation.errors.join(', ')}`);
        }

        // Operation
        const result = this.returnBike(bike);

        // Post-operation validation
        if (result.success) {
            const postValidation = this.validateState();
            if (!postValidation.isValid) {
                // Rollback
                this.dockedBikes.delete(bike.id);
                throw new Error(`Station state became invalid after docking: ${postValidation.errors.join(', ')}`);
            }
        }

        return result;
    }

    /**
     * Business Rule: Reservation soft hold with expiresAfterMinutes
     */
    createReservation(userId, expiresAfterMinutes = 15) {
        if (!this.isActive()) {
            return { success: false, message: `Station ${this.id} is out of service` };
        }

        if (this.isEmpty()) {
            return { success: false, message: `No bikes available at station ${this.id}` };
        }

        const expiryTime = new Date(Date.now() + (expiresAfterMinutes * 60 * 1000));
        this.reservations.set(userId, {
            userId,
            stationId: this.id,
            createdAt: new Date(),
            expiresAt: expiryTime,
            status: BMS_STATES.RESERVATION.ACTIVE
        });

        return {
            success: true,
            operation: BMS_OPERATIONS.RESERVATION_CREATED,
            reservation: this.reservations.get(userId)
        };
    }

    /**
     * Get active (non-expired) reservations
     */
    getActiveReservations() {
        const now = new Date();
        return Array.from(this.reservations.values()).filter(
            res => res.status === BMS_STATES.RESERVATION.ACTIVE && res.expiresAt > now
        );
    }

    /**
     * Expire old reservations
     */
    expireOldReservations() {
        const now = new Date();
        let expiredCount = 0;
        
        for (const [userId, reservation] of this.reservations) {
            if (reservation.expiresAt <= now && reservation.status === BMS_STATES.RESERVATION.ACTIVE) {
                reservation.status = BMS_STATES.RESERVATION.EXPIRED;
                expiredCount++;
            }
        }
        
        return expiredCount;
    }

    /**
     * Business Rule: Return - place bike into any free dock → transition to available; increment count
     */
    returnBike(bike) {
        this.updatedAt = new Date();

        // Business Rule: OOS blocks return
        if (this.isOutOfService()) {
            return {
                success: false,
                operation: BMS_OPERATIONS.RETURN_FAILED_STATION_OOS,
                message: `Cannot return bike ${bike.id}. Station ${this.id} is out of service`,
                stationInfo: this.getStationInfo()
            };
        }

        // Business Rule: Check if there are free docks
        if (this.isFull()) {
            console.log(`BLOCKED: Attempt to return bike ${bike.id} to full station ${this.id}`);
            return {
                success: false,
                operation: BMS_OPERATIONS.RETURN_FAILED_STATION_FULL,
                message: `Cannot return bike ${bike.id}. Station ${this.id} is full - no free docks (${this.getFreeDocks()} free)`,
                stationInfo: this.getStationInfo()
            };
        }

        // Validation: Check if bike is already docked here
        if (this.dockedBikes.has(bike.id)) {
            return {
                success: false,
                operation: BMS_OPERATIONS.RETURN_FAILED_STATION_FULL,
                message: `Bike ${bike.id} is already docked at station ${this.id}`,
                stationInfo: this.getStationInfo()
            };
        }

        // Business Rule: Place bike into free dock → transition to available; increment count
        // Sanity check: validate state transition (only if not already available)
        if (bike.status !== BMS_STATES.BIKE.AVAILABLE) {
            try {
                bike.changeStatus(BMS_STATES.BIKE.AVAILABLE, 'bike return');
            } catch (error) {
                return {
                    success: false,
                    operation: BMS_OPERATIONS.RETURN_FAILED_STATION_FULL,
                    message: `Invalid bike state transition: ${error.message}`,
                    stationInfo: this.getStationInfo()
                };
            }
        }

        this.dockedBikes.set(bike.id, bike);
        bike.location = this.location;

        console.log(`SUCCESS: Bike ${bike.id} returned to station ${this.id} (${this.getBikesAvailable()}/${this.capacity} bikes, ${this.getFreeDocks()} free docks)`);
        
        return {
            success: true,
            operation: BMS_OPERATIONS.RETURN_SUCCESS,
            message: `Bike ${bike.id} successfully returned to station ${this.id}`,
            stationInfo: this.getStationInfo()
        };
    }

    /**
     * Business Rule: Checkout - choose available bike → transition to on_trip; decrement count
     */
    checkoutBike(bikeId = null, userId = null) {
        this.updatedAt = new Date();

        // Business Rule: OOS blocks checkout
        if (this.isOutOfService()) {
            return {
                success: false,
                operation: BMS_OPERATIONS.CHECKOUT_FAILED_STATION_OOS,
                message: `Cannot checkout bike. Station ${this.id} is out of service`,
                stationInfo: this.getStationInfo()
            };
        }

        // Business Rule: Check if station has available bikes
        if (this.isEmpty()) {
            console.log(`BLOCKED: Attempt to checkout from empty station ${this.id}`);
            return {
                success: false,
                operation: BMS_OPERATIONS.CHECKOUT_FAILED_STATION_EMPTY,
                message: `Cannot checkout bike. Station ${this.id} is empty (${this.getBikesAvailable()} bikes available)`,
                stationInfo: this.getStationInfo()
            };
        }

        // Choose bike to checkout
        let bike;
        if (bikeId && this.dockedBikes.has(bikeId)) {
            bike = this.dockedBikes.get(bikeId);
        } else if (!bikeId) {
            // Business Rule: Choose any available bike
            bike = this.getRandomAvailableBike();
        } else {
            return {
                success: false,
                operation: BMS_OPERATIONS.CHECKOUT_FAILED_NO_BIKE,
                message: `Bike ${bikeId} not found at station ${this.id}`,
                stationInfo: this.getStationInfo()
            };
        }

        if (!bike) {
            return {
                success: false,
                operation: BMS_OPERATIONS.CHECKOUT_FAILED_NO_BIKE,
                message: `No available bikes at station ${this.id}`,
                stationInfo: this.getStationInfo()
            };
        }

        // Business Rule: Transition to on_trip; decrement count
        // Sanity check: validate state transition
        try {
            bike.changeStatus(BMS_STATES.BIKE.ON_TRIP, 'bike checkout');
        } catch (error) {
            return {
                success: false,
                operation: BMS_OPERATIONS.CHECKOUT_FAILED_NO_BIKE,
                message: `Invalid bike state transition: ${error.message}`,
                stationInfo: this.getStationInfo()
            };
        }

        this.dockedBikes.delete(bike.id);
        bike.location = null; // Bike is now mobile

        // Use reservation if available
        if (userId && this.reservations.has(userId)) {
            const reservation = this.reservations.get(userId);
            reservation.status = BMS_STATES.RESERVATION.USED;
        }

        console.log(`SUCCESS: Bike ${bike.id} checked out from station ${this.id} (${this.getBikesAvailable()}/${this.capacity} bikes, ${this.getFreeDocks()} free docks)`);
        
        return {
            success: true,
            operation: BMS_OPERATIONS.CHECKOUT_SUCCESS,
            message: `Bike ${bike.id} successfully checked out from station ${this.id}`,
            bike: bike,
            stationInfo: this.getStationInfo()
        };
    }

    /**
     * Get a random available bike for checkout (when no specific bike requested)
     */
    getRandomAvailableBike() {
        const availableBikes = Array.from(this.dockedBikes.values()).filter(
            bike => bike.status === BMS_STATES.BIKE.AVAILABLE
        );
        
        if (availableBikes.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableBikes.length);
        return availableBikes[randomIndex];
    }

    /**
     * Set station status (Business Rule: active | out_of_service)
     */
    setOutOfService() {
        this.status = BMS_STATES.STATION.OUT_OF_SERVICE;
        this.updatedAt = new Date();
        console.log(`Station ${this.id} set to out of service`);
    }

    setActive() {
        this.status = BMS_STATES.STATION.ACTIVE;
        this.updatedAt = new Date();
        console.log(`Station ${this.id} set to active`);
    }

    /**
     * Set station to maintenance mode
     */
    setMaintenance(isOutOfService = true) {
        if (isOutOfService) {
            this.status = 'out_of_service'; // R-BMS-01: out_of_service
            console.log(`Station ${this.id} set to maintenance mode (out_of_service)`);
        } else {
            // Determine appropriate status based on bike count
            const dockedCount = this.dockedBikes.size;
            if (dockedCount === 0) {
                this.status = 'empty'; // R-BMS-01: empty
            } else if (dockedCount >= this.capacity) {
                this.status = 'full'; // R-BMS-01: full
            } else {
                this.status = 'occupied'; // R-BMS-01: occupied
            }
            console.log(`Station ${this.id} returned to service (status: ${this.status})`);
        }
        this.updatedAt = new Date();
    }
}

module.exports = Station;