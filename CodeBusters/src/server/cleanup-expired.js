#!/usr/bin/env node

/**
 * Manual cleanup script for expired reservations
 * This script manually processes expired reservations and updates the configuration
 */

const fs = require('fs');
const path = require('path');

// Load the configuration
const configPath = path.join(__dirname, 'config', 'stations-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const now = new Date();
let cleanupCount = 0;

console.log('🧹 Starting manual reservation cleanup...');
console.log(`Current time: ${now.toISOString()}`);

// Process each station
for (let station of config.stations) {
    console.log(`\n📍 Checking station ${station.id}: ${station.name}`);
    
    for (let bike of station.bikes) {
        if (bike.status === 'reserved' && bike.reservationExpiry) {
            const expiryTime = new Date(bike.reservationExpiry);
            console.log(`  🚲 ${bike.id}: Reserved until ${bike.reservationExpiry}`);
            
            if (expiryTime <= now) {
                console.log(`  ⏰ EXPIRED! Cleaning up ${bike.id}`);
                
                // Clean up the reservation
                delete bike.reservedBy;
                delete bike.reservedAt;
                delete bike.reservationExpiry;
                bike.status = 'available';
                cleanupCount++;
                
                console.log(`  ✅ ${bike.id} is now available`);
            } else {
                const minutesLeft = Math.ceil((expiryTime - now) / (1000 * 60));
                console.log(`  ⏳ Still valid for ${minutesLeft} more minutes`);
            }
        }
    }
}

// Save the updated configuration
if (cleanupCount > 0) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Cleanup complete! ${cleanupCount} expired reservations cleaned up.`);
    console.log('📝 Configuration file updated.');
} else {
    console.log('\n✨ No expired reservations found.');
}