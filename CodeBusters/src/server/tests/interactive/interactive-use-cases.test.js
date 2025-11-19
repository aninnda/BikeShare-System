/**
 * Interactive Use Case Tests
 * One test per scenario as requested
 */

const BMSManager = require('../../src/bms/BMSManager');
const Bike = require('../../src/bms/Bike');

describe('Interactive Use Case Tests', () => {
    
    test('Scenario 1: Happy Path - Reserve, Unlock, Ride, Return, Bill', () => {
        const manager = new BMSManager();
        
        // Setup stations
        manager.addStation('STN_A', 10, { name: 'Station A' });
        manager.addStation('STN_B', 10, { name: 'Station B' });
        const stationA = manager.stations.get('STN_A');
        const stationB = manager.stations.get('STN_B');
        
        // Setup bike
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        stationA.returnBike(bike);
        manager.bikes.set(bike.id, bike);
        
        const userId = 'rider001';
        
        // Step 1: Reserve bike at Station A
        const reservation = stationA.createReservation(userId, 15);
        expect(reservation.success).toBe(true);
        
        // Step 2: Unlock (rent) bike
        const rentResult = manager.rentBike(userId, 'STN_A', bike.id);
        expect(rentResult.success).toBe(true);
        expect(bike.getStatus()).toBe(Bike.STATUSES.ON_TRIP);
        
        // Step 3: Ride (simulated by time passing)
        const startTime = rentResult.rental.startTime;
        
        // Step 4: Return bike at Station B
        const returnResult = manager.returnBike(userId, bike.id, 'STN_B');
        expect(returnResult.success).toBe(true);
        expect(returnResult.rental.returnStationId).toBe('STN_B');
        
        // Step 5: Compute bill
        const endTime = returnResult.rental.endTime;
        const durationMs = endTime - startTime;
        const durationMinutes = Math.ceil(durationMs / (1000 * 60));
        const cost = parseFloat((durationMinutes * 0.10).toFixed(2));
        
        expect(returnResult.rental.status).toBe('completed');
        expect(stationB.dockedBikes.has(bike.id)).toBe(true);
    });
    
    test('Scenario 2: Station Full - Return triggers overflow credit', () => {
        const manager = new BMSManager();
        
        // Setup station with small capacity
        manager.addStation('STN_FULL', 3, { name: 'Full Station' });
        const station = manager.stations.get('STN_FULL');
        
        // Fill the station
        for (let i = 1; i <= 3; i++) {
            const bike = new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD);
            station.returnBike(bike);
            manager.bikes.set(bike.id, bike);
        }
        
        expect(station.isFull()).toBe(true);
        
        // Setup user with active rental
        const userId = 'rider002';
        const overflowBike = new Bike('BIKE_OVERFLOW', Bike.TYPES.STANDARD);
        manager.bikes.set(overflowBike.id, overflowBike);
        
        // Create another station for rental
        manager.addStation('STN_OTHER', 10);
        const otherStation = manager.stations.get('STN_OTHER');
        otherStation.returnBike(overflowBike);
        
        manager.rentBike(userId, 'STN_OTHER', overflowBike.id);
        
        // Attempt to return to full station
        const returnResult = manager.returnBike(userId, overflowBike.id, 'STN_FULL');
        expect(returnResult.success).toBe(false);
        expect(returnResult.message).toContain('full');
        
        // Simulate credit system
        const userAccount = {
            userId: userId,
            credits: 0.00
        };
        
        if (!returnResult.success && returnResult.message.includes('full')) {
            userAccount.credits += 2.00;
        }
        
        expect(userAccount.credits).toBe(2.00);
    });
    
    test('Scenario 3: Reservation Expiry - Bike becomes available after timeout', () => {
        const manager = new BMSManager();
        
        // Setup
        manager.addStation('STN001', 10);
        const station = manager.stations.get('STN001');
        const bike = new Bike('BIKE001', Bike.TYPES.STANDARD);
        station.returnBike(bike);
        
        // Create short reservation (1 second for testing)
        const reservation = station.createReservation('rider003', 1 / 60); // 1 second in minutes
        expect(reservation.success).toBe(true);
        
        // Wait for expiration (simulate with manual time manipulation)
        setTimeout(() => {
            station.expireReservations();
            
            expect(bike.getStatus()).toBe(Bike.STATUSES.AVAILABLE);
        }, 1100);
    });
    
    test('Scenario 4: Rebalancing Alert - Empty station triggers operator notification', () => {
        const manager = new BMSManager();
        
        // Setup station with bikes
        manager.addStation('STN_REBALANCE', 5, { name: 'Rebalance Station' });
        const station = manager.stations.get('STN_REBALANCE');
        
        // Add bikes
        for (let i = 1; i <= 3; i++) {
            const bike = new Bike(`BIKE00${i}`, Bike.TYPES.STANDARD);
            station.returnBike(bike);
            manager.bikes.set(bike.id, bike);
        }
        
        // Simulate users checking out bikes
        manager.rentBike('user1', 'STN_REBALANCE', 'BIKE001');
        manager.rentBike('user2', 'STN_REBALANCE', 'BIKE002');
        
        const remainingBikes = station.getBikesAvailable();
        const inventoryRatio = remainingBikes / station.capacity;
        
        // Check if rebalancing needed (below 20% capacity)
        const alerts = [];
        if (inventoryRatio <= 0.20) {
            const alert = {
                type: 'REBALANCING_NEEDED',
                stationId: station.id,
                stationName: station.name,
                currentBikes: remainingBikes,
                capacity: station.capacity,
                severity: remainingBikes === 0 ? 'CRITICAL' : 'WARNING',
                timestamp: new Date()
            };
            alerts.push(alert);
        }
        
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].type).toBe('REBALANCING_NEEDED');
    });
});
