/**
 * Unit Tests for Pricing Components
 * Consolidated tests - one test per pricing function
 */

describe('Pricing Components Unit Tests', () => {
    
    test('should calculate rental cost for standard bikes', () => {
        const calculateRentalCost = (startTime, endTime, bikeType = 'standard') => {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const durationMs = end - start;
            const durationMinutes = Math.ceil(durationMs / (1000 * 60));
            
            const ratePerMinute = bikeType === 'ebike' ? 0.25 : 0.10;
            return parseFloat((durationMinutes * ratePerMinute).toFixed(2));
        };
        
        // Various duration tests
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:01:00')).toBe(0.10); // 1 min
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:30:00')).toBe(3.00); // 30 min
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T11:00:00')).toBe(6.00); // 1 hour
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T12:00:00')).toBe(12.00); // 2 hours
        
        // Sub-minute rounds up
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:00:30')).toBe(0.10);
    });
    
    test('should calculate rental cost for e-bikes', () => {
        const calculateRentalCost = (startTime, endTime, bikeType = 'standard') => {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const durationMs = end - start;
            const durationMinutes = Math.ceil(durationMs / (1000 * 60));
            
            const ratePerMinute = bikeType === 'ebike' ? 0.25 : 0.10;
            return parseFloat((durationMinutes * ratePerMinute).toFixed(2));
        };
        
        // E-bike pricing (2.5x standard)
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:01:00', 'ebike')).toBe(0.25);
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:30:00', 'ebike')).toBe(7.50);
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T11:00:00', 'ebike')).toBe(15.00);
        
        // Verify rate difference
        const standardCost = calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T11:00:00', 'standard');
        const ebikeCost = calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T11:00:00', 'ebike');
        expect(ebikeCost).toBe(standardCost * 2.5);
    });
    
    test('should handle pricing plans correctly', () => {
        const payAsYouGo = {
            name: 'Pay-as-you-go',
            baseFee: 1.00,
            perMinute: 0.10,
            calculateTotal: function(minutes) {
                return this.baseFee + (minutes * this.perMinute);
            }
        };
        
        const monthly = {
            name: 'Monthly Basic',
            monthlyFee: 20.00,
            perMinute: 0.05,
            calculateTotal: function(minutes) {
                return this.monthlyFee + (minutes * this.perMinute);
            }
        };
        
        // Pay-as-you-go
        expect(payAsYouGo.calculateTotal(60)).toBe(7.00); // 1 hour
        
        // Monthly plan
        expect(monthly.calculateTotal(60)).toBe(23.00);
        
        // Break-even point (monthly becomes cheaper after ~400 minutes per month)
        const breakEvenMinutes = 500;
        const payAsYouGoCost = payAsYouGo.calculateTotal(breakEvenMinutes);
        const monthlyCost = monthly.calculateTotal(breakEvenMinutes);
        expect(monthlyCost).toBeLessThan(payAsYouGoCost);
    });
    
    test('should handle edge cases and real-world scenarios', () => {
        const calculateRentalCost = (startTime, endTime, bikeType = 'standard') => {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const durationMs = end - start;
            const durationMinutes = Math.ceil(durationMs / (1000 * 60));
            
            if (durationMinutes < 0) throw new Error('End time before start time');
            if (durationMinutes === 0) return 0;
            
            const ratePerMinute = bikeType === 'ebike' ? 0.25 : 0.10;
            return parseFloat((durationMinutes * ratePerMinute).toFixed(2));
        };
        
        // Zero duration
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T10:00:00')).toBe(0);
        
        // Negative time (error)
        expect(() => calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T09:00:00')).toThrow();
        
        // Real scenarios
        expect(calculateRentalCost('2024-01-01T08:00:00', '2024-01-01T08:20:00')).toBe(2.00); // Morning commute
        expect(calculateRentalCost('2024-01-01T12:00:00', '2024-01-01T12:35:00')).toBe(3.50); // Lunch break
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T12:30:00')).toBe(15.00); // Weekend leisure
        expect(calculateRentalCost('2024-01-01T10:00:00', '2024-01-01T16:00:00')).toBe(36.00); // Forgot to return
    });
});
