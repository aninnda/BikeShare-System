/**
 * Bike entity for the BMS (Bike Management System)
 * Handles bike states and transitions according to BMS requirements
 */
class Bike {
    // Valid bike statuses as per R-BMS requirements
    static STATUSES = {
        AVAILABLE: 'available',
        RESERVED: 'reserved', 
        ON_TRIP: 'on_trip',
        MAINTENANCE: 'maintenance'
    };

    // Valid bike types
    static TYPES = {
        STANDARD: 'standard',
        E_BIKE: 'e-bike'
    };

    constructor(id, type = Bike.TYPES.STANDARD) {
        this.id = id;
        this.type = type;
        this.status = Bike.STATUSES.AVAILABLE; // All bikes start as available
        this.reservationExpiry = null; // No reservation initially
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

    // Check if bike is currently reserved
    isReserved() {
        return this.status === Bike.STATUSES.RESERVED;
    }

    // Check if reservation has expired
    isReservationExpired() {
        if (!this.reservationExpiry) return false;
        return new Date() > this.reservationExpiry;
    }
}

module.exports = Bike;