/**
 * BMS Constants - Centralized configuration
 * Learning: Keep all constants in one place for maintainability
 */

const BMS_STATES = {
    BIKE: {
        AVAILABLE: 'available',
        RESERVED: 'reserved', 
        ON_TRIP: 'on_trip',        // Business Rule: Checkout transitions bike to on_trip
        IN_USE: 'in_use',
        MAINTENANCE: 'maintenance',
        OUT_OF_SERVICE: 'out_of_service'
    },
    STATION: {
        ACTIVE: 'active',          // Business Rule: Station status active | out_of_service
        OUT_OF_SERVICE: 'out_of_service', // Business Rule: OOS blocks checkout/return
        MAINTENANCE: 'maintenance'
    },
    DOCK: {
        OCCUPIED: 'occupied',      // Business Rule: Occupied docks contain bikes
        FREE: 'free',             // Business Rule: Free docks available for return
        OUT_OF_SERVICE: 'out_of_service'
    },
    RESERVATION: {
        ACTIVE: 'active',
        EXPIRED: 'expired',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    }
};

const DEFAULT_EXPIRY_MINUTES = 15;

// Station/Dock Configuration for its bike capacity
const STATION_CONFIG = {
    DEFAULT_CAPACITY: 10,
    MIN_CAPACITY: 1,
    MAX_CAPACITY: 20
};

// Business Rules for Occupancy Accounting
const OCCUPANCY_RULES = {
    // Business Rule: bikesAvailable == count(occupied docks)
    BIKES_AVAILABLE_FORMULA: 'count_occupied_docks',
    
    // Business Rule: freeDocks == capacity - bikesAvailable  
    FREE_DOCKS_FORMULA: 'capacity_minus_bikes_available',
    
    // Validation Rules
    MAX_OCCUPANCY_PERCENT: 100,
    MIN_OCCUPANCY_PERCENT: 0
};


// BMS Operation Results and the different scenarios
const BMS_OPERATIONS = {
    // Return Operations (Business Rule: place bike into any free dock → transition to available)
    RETURN_SUCCESS: 'return_success',
    RETURN_FAILED_STATION_FULL: 'return_failed_station_full',
    RETURN_FAILED_STATION_OOS: 'return_failed_station_oos',
    
    // Checkout Operations (Business Rule: choose available bike → transition to on_trip)
    CHECKOUT_SUCCESS: 'checkout_success',
    CHECKOUT_FAILED_STATION_EMPTY: 'checkout_failed_station_empty',
    CHECKOUT_FAILED_STATION_OOS: 'checkout_failed_station_oos',
    CHECKOUT_FAILED_NO_BIKE: 'checkout_failed_no_bike',
    
    // Manual Move Operations (Business Rule: operator moves bike A→B atomic decrement/increment)
    MANUAL_MOVE_SUCCESS: 'manual_move_success',
    MANUAL_MOVE_FAILED: 'manual_move_failed',
    
    // Station Operations
    STATION_OOS: 'station_out_of_service',
    STATION_ACTIVE: 'station_active',
    
    // Reservation Operations (Business Rule: soft hold with expiresAfterMinutes)
    RESERVATION_CREATED: 'reservation_created',
    RESERVATION_EXPIRED: 'reservation_expired',
    RESERVATION_USED: 'reservation_used'
};

const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

module.exports = {
    BMS_STATES,
    DEFAULT_EXPIRY_MINUTES,
    STATION_CONFIG,
    BMS_OPERATIONS,
    OCCUPANCY_RULES,
    HTTP_STATUS
};