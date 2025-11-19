/**
 * Unit Tests for History and Rental Tracking
 * Consolidated tests - one test per functionality area
 */

describe('History and Rental Tracking Unit Tests', () => {
    
    test('should handle rental object structure and status', () => {
        const rental = {
            tripId: 'TRIP001',
            userId: 'user123',
            bikeId: 'BIKE001',
            startStationId: 'STN_A',
            endStationId: 'STN_B',
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:30:00'),
            cost: 3.00,
            status: 'completed'
        };
        
        // Structure validation
        expect(rental.tripId).toBeDefined();
        expect(rental.userId).toBeDefined();
        expect(rental.bikeId).toBeDefined();
        
        // Active rental
        const activeRental = { ...rental, endTime: null, status: 'active' };
        expect(activeRental.status).toBe('active');
        expect(activeRental.endTime).toBeNull();
        
        // Completed rental
        expect(rental.status).toBe('completed');
        expect(rental.endTime).toBeDefined();
    });
    
    test('should handle trip information formatting', () => {
        const formatTripId = (userId, timestamp) => {
            const date = new Date(timestamp);
            return `TRIP_${userId}_${date.getTime()}`;
        };
        
        const calculateDuration = (startTime, endTime) => {
            return Math.floor((endTime - startTime) / 1000 / 60); // minutes
        };
        
        const formatDuration = (minutes) => {
            if (minutes < 60) return `${minutes} min`;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        };
        
        // Trip ID formatting
        const tripId = formatTripId('user123', '2024-01-01T10:00:00');
        expect(tripId).toContain('TRIP_user123');
        
        // Duration calculation
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:30:00');
        expect(calculateDuration(start, end)).toBe(30);
        
        // Duration formatting
        expect(formatDuration(30)).toBe('30 min');
        expect(formatDuration(90)).toBe('1h 30m');
    });
    
    test('should identify bike types correctly', () => {
        const identifyBikeType = (bikeId) => {
            return bikeId.startsWith('E') ? 'ebike' : 'standard';
        };
        
        expect(identifyBikeType('BIKE001')).toBe('standard');
        expect(identifyBikeType('EBIKE001')).toBe('ebike');
        expect(identifyBikeType('E123')).toBe('ebike');
    });
    
    test('should filter and search rental history', () => {
        const rentals = [
            { tripId: 'T1', bikeId: 'BIKE001', bikeType: 'standard', cost: 2.00, date: new Date('2024-01-01') },
            { tripId: 'T2', bikeId: 'EBIKE001', bikeType: 'ebike', cost: 5.00, date: new Date('2024-01-02') },
            { tripId: 'T3', bikeId: 'BIKE002', bikeType: 'standard', cost: 3.00, date: new Date('2024-01-03') }
        ];
        
        // Filter by bike type
        const standardRides = rentals.filter(r => r.bikeType === 'standard');
        expect(standardRides.length).toBe(2);
        
        const ebikeRides = rentals.filter(r => r.bikeType === 'ebike');
        expect(ebikeRides.length).toBe(1);
        
        // Filter by trip ID
        const trip = rentals.find(r => r.tripId === 'T2');
        expect(trip).toBeDefined();
        expect(trip.bikeType).toBe('ebike');
        
        // Filter by date range
        const filtered = rentals.filter(r => r.date >= new Date('2024-01-02'));
        expect(filtered.length).toBe(2);
    });
    
    test('should calculate trip statistics', () => {
        const rentals = [
            { cost: 2.00, duration: 20, bikeType: 'standard' },
            { cost: 5.00, duration: 30, bikeType: 'ebike' },
            { cost: 3.00, duration: 25, bikeType: 'standard' }
        ];
        
        // Total cost
        const totalCost = rentals.reduce((sum, r) => sum + r.cost, 0);
        expect(totalCost).toBe(10.00);
        
        // Total duration
        const totalDuration = rentals.reduce((sum, r) => sum + r.duration, 0);
        expect(totalDuration).toBe(75);
        
        // Count by bike type
        const standardCount = rentals.filter(r => r.bikeType === 'standard').length;
        const ebikeCount = rentals.filter(r => r.bikeType === 'ebike').length;
        expect(standardCount).toBe(2);
        expect(ebikeCount).toBe(1);
        
        // Average cost
        const avgCost = parseFloat((totalCost / rentals.length).toFixed(2));
        expect(avgCost).toBe(3.33);
        
        // Average duration
        const avgDuration = Math.floor(totalDuration / rentals.length);
        expect(avgDuration).toBe(25);
    });
    
    test('should handle pagination', () => {
        const allRentals = Array.from({ length: 25 }, (_, i) => ({ tripId: `T${i + 1}` }));
        
        const paginate = (items, page, perPage) => {
            const start = (page - 1) * perPage;
            const end = start + perPage;
            return items.slice(start, end);
        };
        
        // First page
        const page1 = paginate(allRentals, 1, 10);
        expect(page1.length).toBe(10);
        expect(page1[0].tripId).toBe('T1');
        
        // Second page
        const page2 = paginate(allRentals, 2, 10);
        expect(page2.length).toBe(10);
        expect(page2[0].tripId).toBe('T11');
        
        // Last page (partial)
        const page3 = paginate(allRentals, 3, 10);
        expect(page3.length).toBe(5);
        
        // Total pages
        const totalPages = Math.ceil(allRentals.length / 10);
        expect(totalPages).toBe(3);
    });
    
    test('should validate rental data consistency', () => {
        const rental = {
            tripId: 'T1',
            userId: 'user123',
            bikeId: 'BIKE001',
            startTime: new Date('2024-01-01T10:00:00'),
            endTime: new Date('2024-01-01T10:30:00'),
            cost: 3.00,
            duration: 30
        };
        
        // Required fields present
        expect(rental.tripId).toBeDefined();
        expect(rental.userId).toBeDefined();
        expect(rental.bikeId).toBeDefined();
        expect(rental.startTime).toBeDefined();
        
        // Date consistency
        expect(rental.endTime.getTime()).toBeGreaterThan(rental.startTime.getTime());
        
        // Cost formatting
        expect(typeof rental.cost).toBe('number');
        expect(rental.cost.toFixed(2)).toBe('3.00');
        
        // Duration matches times
        const calculatedDuration = Math.floor((rental.endTime - rental.startTime) / 1000 / 60);
        expect(calculatedDuration).toBe(rental.duration);
    });
});
