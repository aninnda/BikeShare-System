const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rbms.db');

// Helper function to add user activity
async function logUserActivity(userId, type, bikeId, details = {}) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        const query = `INSERT INTO user_activities (user_id, type, bike_id, timestamp, details) VALUES (?, ?, ?, ?, ?)`;
        const timestamp = new Date().toISOString();
        
        db.run(query, [userId, type, bikeId, timestamp, JSON.stringify(details)], function(err) {
            if (err) {
                console.error('Error logging user activity:', err);
                reject(err);
            } else {
                console.log(`Activity logged: ${type} for bike ${bikeId}`);
                resolve(this.lastID);
            }
        });
        
        db.close();
    });
}

// Add test rental data with different durations
async function addTestRentals() {
    const userId = 'user123';
    
    // Test 1: Very short rental (30 seconds)
    const now = new Date();
    const shortEnd = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
    const shortStart = new Date(shortEnd.getTime() - 30 * 1000); // 30 seconds duration
    
    console.log('Adding 30-second rental...');
    await logUserActivity(userId, 'rental_completed', 'BIKE001', {
        bikeType: 'standard',
        startStation: 'Test Station 1',
        endStation: 'Test Station 2',
        startTime: shortStart.toISOString(),
        endTime: shortEnd.toISOString(),
        duration: {
            seconds: 30,
            minutes: 0.5,
            formatted: '30s'
        },
        cost: 0.50,
        description: '🏁 Completed ride: 🚴 Standard BIKE001 from Test Station 1 to Test Station 2 (30s) - $0.50'
    });
    
    // Test 2: 2-minute rental
    const twoMinEnd = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    const twoMinStart = new Date(twoMinEnd.getTime() - 2 * 60 * 1000); // 2 minutes duration
    
    console.log('Adding 2-minute rental...');
    await logUserActivity(userId, 'rental_completed', 'BIKE002', {
        bikeType: 'e-bike',
        startStation: 'Test Station 2',
        endStation: 'Test Station 3',
        startTime: twoMinStart.toISOString(),
        endTime: twoMinEnd.toISOString(),
        duration: {
            seconds: 120,
            minutes: 2,
            formatted: '0h 2m'
        },
        cost: 2.00,
        description: '🏁 Completed ride: ⚡ E-Bike BIKE002 from Test Station 2 to Test Station 3 (0h 2m) - $2.00'
    });
    
    // Test 3: 1 hour 30 minute rental
    const longEnd = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
    const longStart = new Date(longEnd.getTime() - 90 * 60 * 1000); // 90 minutes duration
    
    console.log('Adding 1h 30m rental...');
    await logUserActivity(userId, 'rental_completed', 'BIKE003', {
        bikeType: 'standard',
        startStation: 'Test Station 3',
        endStation: 'Test Station 1',
        startTime: longStart.toISOString(),
        endTime: longEnd.toISOString(),
        duration: {
            seconds: 5400,
            minutes: 90,
            formatted: '1h 30m'
        },
        cost: 90.00,
        description: '🏁 Completed ride: 🚴 Standard BIKE003 from Test Station 3 to Test Station 1 (1h 30m) - $90.00'
    });
    
    console.log('All test rentals added!');
}

addTestRentals().catch(console.error);