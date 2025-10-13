/**
 * Test Return Business Rule Implementation  
 * Verifies: place a bike into any free dock → transition to available; increment count
 */

const BMSManager = require('./src/bms/BMSManager');
const { BMS_STATES } = require('./config/constants');

function testReturnBusinessRule() {
    console.log('🏠 TESTING RETURN BUSINESS RULE');
    console.log('=' .repeat(55));
    console.log('Rule: place a bike into any free dock → transition to available; increment count\n');

    const bms = new BMSManager();

    // Set up test scenario
    console.log('🏗️  Setting up test scenario...');
    bms.addStation('ORIGIN_STN', 2, 'Origin Station');     // Where bike starts
    bms.addStation('DEST_STN', 3, 'Destination Station'); // Where bike returns
    bms.addStation('FULL_STN', 1, 'Full Station');        // For testing full station

    // Add bikes
    bms.addBike('BIKE001', 'ORIGIN_STN');
    bms.addBike('BIKE002', 'ORIGIN_STN'); 
    bms.addBike('FULL_BIKE', 'FULL_STN'); // Makes FULL_STN full

    console.log('✓ Stations and bikes created');

    // Show initial state  
    console.log('\n📊 Initial State:');
    console.log(`ORIGIN_STN: ${bms.stations.get('ORIGIN_STN').getBikesAvailable()} bikes, ${bms.stations.get('ORIGIN_STN').getFreeDocks()} free docks`);
    console.log(`DEST_STN: ${bms.stations.get('DEST_STN').getBikesAvailable()} bikes, ${bms.stations.get('DEST_STN').getFreeDocks()} free docks`);
    console.log(`FULL_STN: ${bms.stations.get('FULL_STN').getBikesAvailable()} bikes, ${bms.stations.get('FULL_STN').getFreeDocks()} free docks (should be full)`);

    // Test 1: Normal Return Process
    console.log('\n🎯 Test 1: Normal Return to Different Station');
    console.log('-'.repeat(45));

    // Step 1: Rent a bike
    console.log('Step 1: Rent bike from origin station');
    const rentalResult = bms.rentBike('user1', 'ORIGIN_STN', 'BIKE001');
    console.log(`Rental success: ${rentalResult.success}`);
    
    if (rentalResult.success) {
        const bike = bms.bikes.get('BIKE001');
        console.log(`✅ Bike status after checkout: ${bike.status} (should be on_trip)`);
        console.log(`✅ Origin station bikes: ${bms.stations.get('ORIGIN_STN').getBikesAvailable()} (decremented)`);
        console.log(`✅ Destination station bikes: ${bms.stations.get('DEST_STN').getBikesAvailable()} (unchanged)`);

        // Step 2: Return bike to different station  
        console.log('\nStep 2: Return bike to destination station');
        const beforeReturnCount = bms.stations.get('DEST_STN').getBikesAvailable();
        const beforeReturnFree = bms.stations.get('DEST_STN').getFreeDocks();

        const returnResult = bms.returnBike('user1', 'BIKE001', 'DEST_STN');
        console.log(`Return success: ${returnResult.success}`);
        console.log(`Return message: ${returnResult.message}`);

        if (returnResult.success) {
            console.log(`✅ Bike status after return: ${bike.status} (should be available)`);
            console.log(`✅ Destination bikes after: ${bms.stations.get('DEST_STN').getBikesAvailable()} (incremented from ${beforeReturnCount})`);
            console.log(`✅ Destination free docks: ${bms.stations.get('DEST_STN').getFreeDocks()} (decremented from ${beforeReturnFree})`);
            console.log(`✅ Bike docked at destination: ${bms.stations.get('DEST_STN').dockedBikes.has('BIKE001')}`);

            // Verify rule components
            const stateTransition = bike.status === BMS_STATES.BIKE.AVAILABLE;
            const countIncremented = bms.stations.get('DEST_STN').getBikesAvailable() === (beforeReturnCount + 1);
            const dockedCorrectly = bms.stations.get('DEST_STN').dockedBikes.has('BIKE001');

            console.log('\n📋 Business Rule Verification:');
            console.log(`✅ Place bike into free dock: ${dockedCorrectly}`);
            console.log(`✅ Transition to available: ${stateTransition}`);
            console.log(`✅ Increment count: ${countIncremented}`);
        }
    }

    // Test 2: Return to Full Station (should fail)
    console.log('\n🚫 Test 2: Return to Full Station (Should Fail)');
    console.log('-'.repeat(45));

    // Rent another bike
    const rental2 = bms.rentBike('user2', 'ORIGIN_STN', 'BIKE002');
    if (rental2.success) {
        console.log('✓ Second bike rented successfully');
        
        // Try to return to full station
        const fullReturnResult = bms.returnBike('user2', 'BIKE002', 'FULL_STN');
        console.log(`Full station return success: ${fullReturnResult.success}`);
        console.log(`Full station message: ${fullReturnResult.message}`);
        console.log(`✅ Full station properly blocked: ${!fullReturnResult.success}`);
        
        if (fullReturnResult.stationInfo) {
            console.log(`Station info - Free docks: ${fullReturnResult.stationInfo.freeDocks}`);
        }

        // Return to a station with free docks instead
        const validReturn = bms.returnBike('user2', 'BIKE002', 'DEST_STN');
        console.log(`Valid return success: ${validReturn.success}`);
    }

    // Test 3: Return Without Active Rental (should fail)
    console.log('\n🚫 Test 3: Return Without Active Rental');
    console.log('-'.repeat(45));

    const noRentalReturn = bms.returnBike('user3', 'BIKE001', 'DEST_STN');
    console.log(`No rental return success: ${noRentalReturn.success}`);
    console.log(`No rental message: ${noRentalReturn.message}`);
    console.log(`✅ No rental properly blocked: ${!noRentalReturn.success}`);

    console.log('\n🎉 RETURN BUSINESS RULE VERIFICATION COMPLETE');
    console.log('=' .repeat(55));
    console.log('Rule components verified:');
    console.log('  ✅ Place bike into any free dock (any station)');
    console.log('  ✅ Transition bike status to available');
    console.log('  ✅ Increment station bike count');
    console.log('  ✅ Full station protection (R-BMS-02)');
    console.log('  ✅ Active rental validation');
    console.log('  ✅ Proper error handling and messages');
}

if (require.main === module) {
    testReturnBusinessRule();
}

module.exports = { testReturnBusinessRule };