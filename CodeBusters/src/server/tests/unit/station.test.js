/**
 * Unit Tests for Station Class
 * Consolidated tests - one test per method/functionality
 */

const Station = require('../../src/bms/Station');
const Bike = require('../../src/bms/Bike');

describe('Station Class Unit Tests', () => {
    
    test('should handle station initialization and validation', () => {
        // Valid initialization
        const station = new Station('STN001', 10, { name: 'Main Station', latitude: 40.7128 });
        expect(station.id).toBe('STN001');
        expect(station.capacity).toBe(10);
        expect(station.name).toBe('Main Station');
        
        // Invalid ID
        expect(() => new Station('', 10)).toThrow('non-empty string');
        
        // Invalid capacity
        expect(() => new Station('STN002', -5)).toThrow('positive number');
        
        // Capacity constraints
        const minStation = new Station('STN003', 1);
        expect(minStation.capacity).toBeGreaterThanOrEqual(1); // MIN_CAPACITY enforced
        
        const maxStation = new Station('STN004', 1000);
        expect(maxStation.capacity).toBe(20); // MAX_CAPACITY
    });
    
    test('should provide accurate station information and status', () => {
        const station = new Station('STN001', 5);
        const bike1 = new Bike('BIKE001', Bike.TYPES.STANDARD);
        const bike2 = new Bike('BIKE002', Bike.TYPES.STANDARD);
        
        station.returnBike(bike1);
        station.returnBike(bike2);
        
        // Station info
        const info = station.getStationInfo();
        expect(info.bikesAvailable).toBe(2);
        expect(info.freeDocks).toBe(3);
        
        // Status checks
        expect(station.isEmpty()).toBe(false);
        expect(station.isFull()).toBe(false);
        expect(station.isActive()).toBe(true);
        
        station.status = 'out_of_service';
        expect(station.isActive()).toBe(false);
    });
    
    test('should handle bike docking (return) operations', () => {
        const station = new Station('STN001', 3);
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        
        // Successful dock
        const result = station.returnBike(bike);
        expect(result.success).toBe(true);
        expect(station.dockedBikes.has(bike.id)).toBe(true);
        
        // Fill station
        station.returnBike(new Bike('BIKE002', Bike.TYPES.STANDARD));
        station.returnBike(new Bike('BIKE003', Bike.TYPES.STANDARD));
        expect(station.isFull()).toBe(true);
        
        // Fail to dock to full station
        const fullResult = station.returnBike(new Bike('BIKE004', Bike.TYPES.STANDARD));
        expect(fullResult.success).toBe(false);
        expect(fullResult.message).toContain('full');
        
        // Fail to dock to out-of-service station
        const station2 = new Station('STN002', 5);
        station2.status = 'out_of_service';
        const oosResult = station2.returnBike(bike);
        expect(oosResult.success).toBe(false);
    });
    
    test('should handle bike checkout (undocking) operations', () => {
        const station = new Station('STN001', 5);
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        
        // Successful checkout
        const result = station.checkoutBike(bike.id, 'user123');
        expect(result.success).toBe(true);
        expect(station.dockedBikes.has(bike.id)).toBe(false);
        
        // Fail from empty station
        const emptyResult = station.checkoutBike('BIKE002', 'user456');
        expect(emptyResult.success).toBe(false);
        expect(emptyResult.message).toContain('empty');
        
        // Fail with bike not at station
        const bike2 = new Bike('BIKE003', Bike.TYPES.STANDARD);
        station.returnBike(bike2);
        const notFoundResult = station.checkoutBike('NONEXISTENT', 'user789');
        expect(notFoundResult.success).toBe(false);
        
        // Fail from out-of-service station
        station.status = 'out_of_service';
        const oosResult = station.checkoutBike(bike2.id, 'user999');
        expect(oosResult.success).toBe(false);
    });
    
    test('should handle reservation management', () => {
        const station = new Station('STN001', 5);
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        
        // Create reservation
        const result = station.createReservation('user123', 15);
        expect(result.success).toBe(true);
        expect(result.reservation).toBeDefined();
        
        // Get active reservations
        const reservations = station.getActiveReservations();
        expect(reservations.length).toBe(1);
        
        // Expire old reservations
        const oldReservation = {
            userId: 'user456',
            bikeId: bike.id,
            expiryTime: new Date(Date.now() - 1000),
            createdAt: new Date(Date.now() - 20000)
        };
        station.reservations.set('old-bike-id', oldReservation);
        station.expireOldReservations();
        // expireOldReservations marks old ones as expired but doesn't delete
        expect(station.getActiveReservations().length).toBe(1); // Only active one remains
        
        // Fail to reserve from empty station
        station.checkoutBike(bike.id, 'user1');
        const emptyResult = station.createReservation('user789', 15);
        expect(emptyResult.success).toBe(false);
        
        // Fail from out-of-service station
        station.returnBike(bike);
        station.status = 'out_of_service';
        const oosResult = station.createReservation('user000', 15);
        expect(oosResult.success).toBe(false);
    });
    
    test('should validate station state correctly', () => {
        const station = new Station('STN001', 5);
        
        // Valid state
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        let validation = station.validateState();
        expect(validation.isValid).toBe(true);
        
        // Capacity violation (manual corruption)
        station.dockedBikes.set('BIKE002', new Bike('BIKE002', Bike.TYPES.STANDARD));
        station.dockedBikes.set('BIKE003', new Bike('BIKE003', Bike.TYPES.STANDARD));
        station.dockedBikes.set('BIKE004', new Bike('BIKE004', Bike.TYPES.STANDARD));
        station.dockedBikes.set('BIKE005', new Bike('BIKE005', Bike.TYPES.STANDARD));
        station.dockedBikes.set('BIKE006', new Bike('BIKE006', Bike.TYPES.STANDARD));
        validation = station.validateState();
        expect(validation.isValid).toBe(false);
        expect(validation.errors[0]).toContain('capacity');
    });
    
    test('should track occupancy accounting accurately', () => {
        const station = new Station('STN001', 5);
        
        // Add bikes
        for (let i = 1; i <= 3; i++) {
            station.returnBike(new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD));
        }
        expect(station.getBikesAvailable()).toBe(3);
        expect(station.getFreeDocks()).toBe(2);
        
        // Checkout bikes
        station.checkoutBike('BIKE001', 'user1');
        station.checkoutBike('BIKE002', 'user2');
        expect(station.getBikesAvailable()).toBe(1);
        expect(station.getFreeDocks()).toBe(4);
    });
});
