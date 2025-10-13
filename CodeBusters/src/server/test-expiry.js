#!/usr/bin/env node

/**
 * Test script for reservation expiry functionality
 * This script will create a test reservation and verify that it expires correctly
 */

const fs = require('fs');
const path = require('path');

async function testReservationExpiry() {
    try {
        console.log('🧪 Testing reservation expiry functionality\n');
        
        // 1. Create a test reservation that expires in 1 minute
        console.log('1. Creating test reservation with 1-minute expiry...');
        
        const configPath = path.join(__dirname, 'config', 'stations-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Find first available bike
        let testBike = null;
        let testStation = null;
        
        for (let station of config.stations) {
            for (let bike of station.bikes) {
                if (bike.status === 'available' && !bike.reservedBy) {
                    testBike = bike;
                    testStation = station;
                    break;
                }
            }
            if (testBike) break;
        }
        
        if (!testBike) {
            console.log('❌ No available bikes found for testing');
            return;
        }
        
        // Create a reservation that expires in 1 minute
        const now = new Date();
        const expiryTime = new Date(now.getTime() + 60000); // 1 minute from now
        
        testBike.status = 'reserved';
        testBike.reservedBy = 'test-user';
        testBike.reservedAt = now.toISOString();
        testBike.reservationExpiry = expiryTime.toISOString();
        
        // Save the config
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        console.log(`✅ Created test reservation:`);
        console.log(`   Bike: ${testBike.id} at station ${testStation.id}`);
        console.log(`   Reserved by: test-user`);
        console.log(`   Expires at: ${expiryTime.toISOString()}`);
        console.log(`   Current time: ${now.toISOString()}\n`);
        
        console.log('⏰ Reservation will expire in 1 minute.');
        console.log('🔄 The server background task should automatically clean it up.');
        console.log('📝 Check the server logs or run the cleanup script after 1 minute to verify.\n');
        
        console.log('Commands to test:');
        console.log('  - Check current reservations: grep -A3 -B1 "reservedBy" config/stations-config.json');
        console.log('  - Manual cleanup: node cleanup-expired-reservations.js');
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    }
}

// Run the test
testReservationExpiry();