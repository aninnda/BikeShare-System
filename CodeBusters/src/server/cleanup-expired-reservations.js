#!/usr/bin/env node

/**
 * Manual cleanup script for expired reservations
 * This script will clean up expired reservations from the stations config file
 * Run this when reservations are stuck after expiry
 */

const fs = require('fs');
const path = require('path');

function cleanupExpiredReservations() {
    try {
        const configPath = path.join(__dirname, 'config', 'stations-config.json');
        console.log('Loading stations config from:', configPath);
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const now = new Date();
        let cleanupCount = 0;
        let totalReservations = 0;
        
        console.log('Current time:', now.toISOString());
        console.log('Checking for expired reservations...\n');
        
        // Check all bikes in stations config for expired reservations
        for (let station of config.stations) {
            for (let bike of station.bikes) {
                if (bike.reservedBy && bike.reservationExpiry) {
                    totalReservations++;
                    const expiryTime = new Date(bike.reservationExpiry);
                    
                    console.log(`Bike ${bike.id}:`);
                    console.log(`  Reserved by: ${bike.reservedBy}`);
                    console.log(`  Expires at: ${bike.reservationExpiry}`);
                    console.log(`  Expired: ${expiryTime < now ? 'YES' : 'NO'}`);
                    
                    if (expiryTime < now) {
                        console.log(`  -> Cleaning up expired reservation`);
                        delete bike.reservedBy;
                        delete bike.reservedAt;
                        delete bike.reservationExpiry;
                        bike.status = 'available';
                        cleanupCount++;
                    }
                    console.log('');
                }
            }
        }
        
        console.log(`Summary:`);
        console.log(`- Total reservations found: ${totalReservations}`);
        console.log(`- Expired reservations cleaned: ${cleanupCount}`);
        
        if (cleanupCount > 0) {
            // Save the cleaned config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`✅ Updated stations config file`);
        } else {
            console.log('✅ No cleanup needed');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupExpiredReservations();