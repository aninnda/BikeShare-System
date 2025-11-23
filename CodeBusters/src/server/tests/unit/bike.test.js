/**
 * Unit Tests for Bike Class
 * Consolidated tests - one test per method/functionality
 */

const Bike = require('../../src/bms/Bike');

describe('Bike Class Unit Tests', () => {
    
    test('should handle bike initialization and validation', () => {
        // Valid bike creation
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        expect(bike.id).toBe('BIKE001');
        expect(bike.type).toBe('standard');
        expect(bike.status).toBe(Bike.STATUSES.AVAILABLE);
        expect(bike.createdAt).toBeDefined();
        
        // E-bike creation
        const ebike = new Bike('EBIKE001', Bike.TYPES.E_BIKE);
        expect(ebike.type).toBe('e-bike');
        
        // Invalid ID
        expect(() => new Bike('', Bike.TYPES.STANDARD)).toThrow('non-empty string');
        
        // Invalid type
        expect(() => new Bike('BIKE002', 'invalid')).toThrow('Invalid bike type');
    });
    
    test('should manage bike status and provide info', () => {
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        
        // Get status
        expect(bike.getStatus()).toBe(Bike.STATUSES.AVAILABLE);
        expect(bike.isAvailable()).toBe(true);
        expect(bike.isReserved()).toBe(false);
        
        // Get bike information
        const info = bike.getInfo();
        expect(info.id).toBe('BIKE001');
        expect(info.type).toBe('standard');
        expect(info.status).toBe('available');
    });
    
    test('should handle state transitions correctly', () => {
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        
        // Valid transitions
        expect(bike.isValidTransition(Bike.STATUSES.RESERVED)).toBe(true);
        expect(bike.isValidTransition(Bike.STATUSES.ON_TRIP)).toBe(true);
        
        // Change status
        bike.changeStatus(Bike.STATUSES.RESERVED);
        expect(bike.status).toBe(Bike.STATUSES.RESERVED);
        expect(bike.updatedAt).toBeDefined();
        
        // Test transition back to available from reserved (this is valid per VALID_TRANSITIONS)
        expect(bike.isValidTransition(Bike.STATUSES.AVAILABLE)).toBe(true);
        bike.changeStatus(Bike.STATUSES.AVAILABLE);
        expect(bike.status).toBe(Bike.STATUSES.AVAILABLE);
    });
    
    test('should handle reservation functionality', () => {
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        
        // Successful reservation
        const result = bike.reserve('user123', 15);
        expect(result.success).toBe(true);
        expect(bike.status).toBe(Bike.STATUSES.RESERVED);
        expect(bike.reservedBy).toBe('user123');
        expect(bike.reservationExpiry).toBeDefined();
        
        // Check expiry
        expect(bike.isReservationExpired()).toBe(false);
        
        // Fail to reserve non-available bike
        const result2 = bike.reserve('user456', 15);
        expect(result2.success).toBe(false);
        
        // Handle reservation with no expiry
        bike.status = Bike.STATUSES.AVAILABLE;
        bike.reservationExpiry = null;
        expect(bike.isReservationExpired()).toBe(false);
    });
    
    test('should have correct constants and transition rules', () => {
        // Status constants
        expect(Bike.STATUSES.AVAILABLE).toBe('available');
        expect(Bike.STATUSES.RESERVED).toBe('reserved');
        expect(Bike.STATUSES.ON_TRIP).toBe('on_trip');
        expect(Bike.STATUSES.MAINTENANCE).toBe('maintenance');
        
        // Type constants
        expect(Bike.TYPES.STANDARD).toBe('standard');
        expect(Bike.TYPES.E_BIKE).toBe('e-bike');
        
        // Valid transitions exist
        expect(Bike.VALID_TRANSITIONS).toBeDefined();
        expect(Bike.VALID_TRANSITIONS[Bike.STATUSES.AVAILABLE]).toContain(Bike.STATUSES.RESERVED);
    });
});
