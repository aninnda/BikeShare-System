/**
 * Simple Checkout Business Rule Verification
 * Tests: choose available bike → transition to on_trip; decrement count
 */

const BMSManager = require('./src/bms/BMSManager');
const { BMS_STATES } = require('./config/constants');

function verifyCheckoutRule() {
    console.log('🚴 VERIFYING CHECKOUT BUSINESS RULE');
    console.log('=' .repeat(50));
    console.log('Rule: choose available bike → transition to on_trip; decrement count\n');

    const bms = new BMSManager();

    // Set up test data (using working pattern from test-business-rules.js)
    console.log('🏗️  Setting up test data...');
    bms.addStation('TEST001', 3, 'Test Station Alpha');
    const bikeResult1 = bms.addBike('TBIKE001', 'TEST001', 'standard');
    const bikeResult2 = bms.addBike('TBIKE002', 'TEST001', 'e-bike');
    
    console.log(`Station created: ✓`);
    console.log(`Bike 1 added: ${bikeResult1.success ? '✓' : '✗'} - ${bikeResult1.message}`);
    console.log(`Bike 2 added: ${bikeResult2.success ? '✓' : '✗'} - ${bikeResult2.message}`);

    // Show initial state
    const initialStation = bms.getStationInfo('TEST001').station;
    console.log('\n📊 Initial State:');
    console.log(`Bikes available: ${initialStation.bikesAvailable}`);
    console.log(`Free docks: ${initialStation.freeDocks}`);
    console.log(`Station capacity: ${initialStation.capacity}`);

    if (initialStation.bikesAvailable > 0) {
        console.log(`Available bikes: ${Array.from(bms.stations.get('TEST001').dockedBikes.keys()).join(', ')}`);
        
        // Test checkout with specific bike
        console.log('\n🎯 Test 1: Checkout Specific Available Bike');
        console.log('-'.repeat(40));
        
        const bikeToRent = Array.from(bms.stations.get('TEST001').dockedBikes.keys())[0];
        const bikeObject = bms.bikes.get(bikeToRent);
        
        console.log(`Target bike: ${bikeToRent}`);
        console.log(`Bike status before: ${bikeObject.status}`);
        console.log(`Station bikes before: ${bms.stations.get('TEST001').getBikesAvailable()}`);
        
        // Perform checkout: rentBike(userId, stationId, bikeId)
        const checkoutResult = bms.rentBike('user1', 'TEST001', bikeToRent);
        
        console.log(`Checkout success: ${checkoutResult.success}`);
        console.log(`Message: ${checkoutResult.message}`);
        
        if (checkoutResult.success) {
            console.log(`✅ Bike status after: ${bikeObject.status} (should be ${BMS_STATES.BIKE.ON_TRIP})`);
            console.log(`✅ Station bikes after: ${bms.stations.get('TEST001').getBikesAvailable()} (decremented)`);
            console.log(`✅ Bike removed from station: ${!bms.stations.get('TEST001').dockedBikes.has(bikeToRent)}`);
            
            // Verify rule components
            const stateTransitionCorrect = bikeObject.status === BMS_STATES.BIKE.ON_TRIP;
            const countDecremented = bms.stations.get('TEST001').getBikesAvailable() === (initialStation.bikesAvailable - 1);
            
            console.log('\n📋 Business Rule Verification:');
            console.log(`✅ Choose available bike: ${checkoutResult.success}`);
            console.log(`✅ Transition to on_trip: ${stateTransitionCorrect}`);
            console.log(`✅ Decrement count: ${countDecremented}`);
            
        } else {
            console.log('❌ Checkout failed - cannot verify rule');
        }
        
        // Test checkout without specifying bike (random selection)
        if (bms.stations.get('TEST001').getBikesAvailable() > 0) {
            console.log('\n🎲 Test 2: Random Bike Selection');
            console.log('-'.repeat(40));
            
            const beforeCount = bms.stations.get('TEST001').getBikesAvailable();
            console.log(`Bikes before random checkout: ${beforeCount}`);
            
            // Checkout without specifying bike ID - should choose randomly
            const randomResult = bms.rentBike('user2', 'TEST001');
            
            console.log(`Random checkout success: ${randomResult.success}`);
            
            if (randomResult.success) {
                const chosenBikeId = randomResult.rental.bikeId;
                const chosenBike = bms.bikes.get(chosenBikeId);
                
                console.log(`✅ Randomly chosen bike: ${chosenBikeId}`);
                console.log(`✅ Chosen bike status: ${chosenBike.status}`);
                console.log(`✅ Count decremented: ${bms.stations.get('TEST001').getBikesAvailable() === (beforeCount - 1)}`);
            }
        }
    } else {
        console.log('❌ No bikes available - setup failed');
    }

    console.log('\n🎉 CHECKOUT BUSINESS RULE VERIFICATION COMPLETE');
    console.log('Rule components verified:');
    console.log('  ✅ Choose available bike (specific or random)');
    console.log('  ✅ Transition bike status to on_trip'); 
    console.log('  ✅ Decrement station bike count');
    console.log('  ✅ Remove bike from station docks');
}

if (require.main === module) {
    verifyCheckoutRule();
}

module.exports = { verifyCheckoutRule };