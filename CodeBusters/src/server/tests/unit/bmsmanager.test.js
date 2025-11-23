/**
 * Unit Tests for BMSManager Class
 * Consolidated tests - one test per functionality
 */

const BMSManager = require('../../src/bms/BMSManager');
const Bike = require('../../src/bms/Bike');

describe('BMSManager Class Unit Tests', () => {
    
    test('should initialize BMSManager with empty collections and statistics', () => {
        const manager = new BMSManager();
        
        expect(manager.stations.size).toBe(0);
        expect(manager.bikes.size).toBe(0);
        expect(manager.activeRentals.size).toBe(0);
        expect(manager.systemStats.totalOperations).toBe(0);
        expect(manager.systemStats.successfulDocks).toBe(0);
        expect(manager.systemStats.blockedOperations).toBe(0);
    });
    
    test('should handle station operations (add, duplicate, invalid, get)', () => {
        const manager = new BMSManager();
        
        // Add station successfully
        const result = manager.addStation('STN001', 10, { name: 'Main Station' });
        expect(result.success).toBe(true);
        expect(manager.stations.has('STN001')).toBe(true);
        
        // Fail to add duplicate
        const dupResult = manager.addStation('STN001', 10);
        expect(dupResult.success).toBe(false);
        expect(dupResult.message).toContain('already exists');
        
        // Fail with invalid ID
        const invalidResult = manager.addStation('', 10);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.message).toContain('non-empty string');
        
        // Get station by ID
        const station = manager.stations.get('STN001');
        expect(station).toBeDefined();
        expect(station.id).toBe('STN001');
    });
    
    test('should track bikes in system', () => {
        const manager = new BMSManager();
        manager.addStation('STN001', 10);
        
        // Add bikes
        for (let i = 1; i <= 5; i++) {
            const bike = new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD);
            manager.bikes.set(bike.id, bike);
        }
        
        expect(manager.bikes.size).toBe(5);
    });
    
    test('should handle rentBike operations (success, tracking, failures)', () => {
        const manager = new BMSManager();
        manager.addStation('STN001', 10);
        const station = manager.stations.get('STN001');
        
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        manager.bikes.set(bike.id, bike);
        
        // Successful checkout
        const result = manager.rentBike('user1', 'STN001', bike.id);
        expect(result.success).toBe(true);
        expect(result.rental.userId).toBe('user1');
        expect(manager.activeRentals.has('user1')).toBe(true);
        
        // Return for next tests
        manager.returnBike('user1', bike.id, 'STN001');
        
        // Fail from non-existent station
        const invalidResult = manager.rentBike('user2', 'INVALID', bike.id);
        expect(invalidResult.success).toBe(false);
        
        // Checkout to make station empty
        manager.rentBike('user2', 'STN001', bike.id);
        
        // Fail from empty station
        const emptyResult = manager.rentBike('user3', 'STN001', 'BIKE002');
        expect(emptyResult.success).toBe(false);
        
        // Test out-of-service
        manager.returnBike('user2', bike.id, 'STN001');
        station.status = 'out_of_service';
        const oosResult = manager.rentBike('user4', 'STN001', bike.id);
        expect(oosResult.success).toBe(false);
    });
    
    test('should handle returnBike operations (success, failures, statistics)', () => {
        const manager = new BMSManager();
        manager.addStation('STN_A', 10);
        manager.addStation('STN_B', 10);
        const stationA = manager.stations.get('STN_A');
        const stationB = manager.stations.get('STN_B');
        
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        stationA.returnBike(bike);
        manager.bikes.set(bike.id, bike);
        manager.rentBike('user1', 'STN_A', bike.id);
        
        // Successful return to different station
        const result = manager.returnBike('user1', bike.id, 'STN_B');
        expect(result.success).toBe(true);
        expect(result.rental.returnStationId).toBe('STN_B');
        expect(manager.activeRentals.has('user1')).toBe(false);
        
        // Fail without active rental
        const noRentalResult = manager.returnBike('user999', bike.id, 'STN_B');
        expect(noRentalResult.success).toBe(false);
        
        // Setup for more tests
        manager.rentBike('user1', 'STN_B', bike.id);
        
        // Fail with wrong bike
        const wrongBikeResult = manager.returnBike('user1', 'WRONG', 'STN_A');
        expect(wrongBikeResult.success).toBe(false);
        
        // Fail to non-existent station
        const invalidResult = manager.returnBike('user1', bike.id, 'INVALID');
        expect(invalidResult.success).toBe(false);
        
        // Fill station to test full station
        for (let i = 2; i <= 11; i++) {
            const b = new Bike(`BIKE0${i}`, Bike.TYPES.STANDARD);
            stationA.returnBike(b);
        }
        
        const blockedBefore = manager.systemStats.blockedOperations;
        const fullResult = manager.returnBike('user1', bike.id, 'STN_A');
        expect(fullResult.success).toBe(false);
        expect(manager.systemStats.blockedOperations).toBe(blockedBefore + 1);
    });
    
    test('should validate system state (empty, with bikes, with rentals)', () => {
        const manager = new BMSManager();
        
        // Empty system
        let validation = manager.validateSystemState();
        expect(validation.isValid).toBe(true);
        
        // With stations and bikes
        manager.addStation('STN001', 10);
        const station = manager.stations.get('STN001');
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        manager.bikes.set(bike.id, bike);
        
        validation = manager.validateSystemState();
        expect(validation.isValid).toBe(true);
        expect(validation.stats.totalBikes).toBe(1);
        
        // With active rentals
        manager.rentBike('user1', 'STN001', bike.id);
        validation = manager.validateSystemState();
        expect(validation.isValid).toBe(true);
        expect(validation.stats.totalRentedBikes).toBe(1);
    });
    
    test('should get comprehensive system overview', () => {
        const manager = new BMSManager();
        manager.addStation('STN001', 10);
        const station = manager.stations.get('STN001');
        
        // Add bikes
        for (let i = 1; i <= 3; i++) {
            const bike = new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD);
            station.returnBike(bike);
            manager.bikes.set(bike.id, bike);
        }
        
        // Checkout one bike
        manager.rentBike('user1', 'STN001', 'BIKE001');
        
        const overview = manager.getSystemOverview();
        expect(overview.totalStations).toBe(1);
        expect(overview.totalBikes).toBe(3);
        expect(overview.activeRentals).toBe(1);
    });
    
    test('should handle multiple concurrent operations', () => {
        const manager = new BMSManager();
        manager.addStation('STN001', 10);
        const station = manager.stations.get('STN001');
        
        // Add bikes
        for (let i = 1; i <= 5; i++) {
            const bike = new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD);
            station.returnBike(bike);
            manager.bikes.set(bike.id, bike);
        }
        
        // Multiple users checkout
        const users = ['user1', 'user2', 'user3'];
        const bikes = ['BIKE001', 'BIKE002', 'BIKE003'];
        
        for (let i = 0; i < users.length; i++) {
            const result = manager.rentBike(users[i], 'STN001', bikes[i]);
            expect(result.success).toBe(true);
        }
        
        expect(manager.activeRentals.size).toBe(3);
        
        // Checkout and return sequence
        const result = manager.rentBike('user4', 'STN001', 'BIKE004');
        expect(result.success).toBe(true);
        
        const returnResult = manager.returnBike('user4', 'BIKE004', 'STN001');
        expect(returnResult.success).toBe(true);
        expect(manager.activeRentals.has('user4')).toBe(false);
        
        // Note: User already has an active rental
        expect(manager.activeRentals.has('user1')).toBe(true);
    });
});
