/**
 * Bike entity for the BMS (Bike Management System)
 * Handles bike states and transitions according to BMS requirements
 * Includes sanity checking for valid state transitions
 */
class Bike {
    // Valid bike statuses as per R-BMS requirements
    static STATUSES = {
        AVAILABLE: 'available',
        RESERVED: 'reserved', 
        ON_TRIP: 'on_trip',
        MAINTENANCE: 'maintenance'
    };

    // Valid state transitions (sanity checking)
    static VALID_TRANSITIONS = {
        'available': ['reserved', 'on_trip', 'maintenance'],
        'reserved': ['available', 'on_trip', 'maintenance'],
        'on_trip': ['available', 'maintenance'],
        'maintenance': ['available']
    };

    // Valid bike types
    static TYPES = {
        STANDARD: 'standard',
        E_BIKE: 'e-bike'
    };

    constructor(id, type = Bike.TYPES.STANDARD) {
        // Sanity check: validate input
        if (!id || typeof id !== 'string') {
            throw new Error('Bike ID must be a non-empty string');
        }
        if (!Object.values(Bike.TYPES).includes(type)) {
            throw new Error(`Invalid bike type: ${type}`);
        }

        this.id = id;
        this.type = type;
        this.status = Bike.STATUSES.AVAILABLE; // All bikes start as available
        this.reservationExpiry = null; // No reservation initially
        this.reservedBy = null; // Track who reserved the bike
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // Get current status
    getStatus() {
        return this.status;
    }

    // Get bike info
    getInfo() {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            reservationExpiry: this.reservationExpiry,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Check if bike is available for reservation/checkout
    isAvailable() {
        return this.status === Bike.STATUSES.AVAILABLE;
    }

    // Sanity checking: validate state transitions
    isValidTransition(newStatus) {
        if (!Object.values(Bike.STATUSES).includes(newStatus)) {
            return false;
        }
        const validTransitions = Bike.VALID_TRANSITIONS[this.status];
        return validTransitions && validTransitions.includes(newStatus);
    }

    // Sanity checking: safe status change
    changeStatus(newStatus, reason = 'status change') {
        if (!this.isValidTransition(newStatus)) {
            throw new Error(`Invalid transition from ${this.status} to ${newStatus} (${reason})`);
        }
        this.status = newStatus;
        this.updatedAt = new Date();
        return true;
    }

    // Check if bike is currently reserved
    isReserved() {
        return this.status === Bike.STATUSES.RESERVED;
    }

    // Check if reservation has expired
    isReservationExpired() {
        if (!this.reservationExpiry) return false;
        return new Date() > this.reservationExpiry;
    }

    // Reserve a bike for a user
    reserve(userId, expiresAfterMinutes = 15) {
        // Step 1: Validate current state
        if (this.status !== Bike.STATUSES.AVAILABLE) {
            return {
                success: false,
                message: `Cannot reserve bike. Current status: ${this.status}`
            };
        }

        // Step 2: Calculate expiry time
        const now = new Date();
        const expiryTime = new Date(now.getTime() + (expiresAfterMinutes * 60 * 1000));

        // Step 3: Update bike state with sanity checking
        if (!this.isValidTransition(Bike.STATUSES.RESERVED)) {
            return {
                success: false,
                message: `Invalid state transition from ${this.status} to reserved`
            };
        }

        this.status = Bike.STATUSES.RESERVED;
        this.reservedBy = userId;
        this.reservationExpiry = expiryTime;
        this.updatedAt = new Date();

        // Step 4: Return success
        return {
            success: true,
            message: 'Bike reserved successfully',
            data: {
                reservedBy: this.reservedBy,
                expiresAt: this.reservationExpiry
            }
        };
    }
}

module.exports = Bike;