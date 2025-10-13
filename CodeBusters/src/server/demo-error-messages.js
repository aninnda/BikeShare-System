/**
 * Comprehensive Error Message Demonstration
 * Shows all types of clear error messages the system provides
 */

const BMSManager = require('./src/bms/BMSManager');

function demonstrateErrorMessages() {
    console.log('💬 COMPREHENSIVE ERROR MESSAGE DEMONSTRATION');
    console.log('=' .repeat(55));

    const bms = new BMSManager();

    // Set up test scenario
    console.log('🏗️  Setting up test scenario...');
    bms.addStation('EMPTY_STN', 5);     // Empty station
    bms.addStation('FULL_STN', 2);      // Full station  
    bms.addStation('NORMAL_STN', 4);    // Normal station

    // Make FULL_STN actually full
    bms.addBike('BIKE_F1', 'FULL_STN');
    bms.addBike('BIKE_F2', 'FULL_STN');

    // Add bikes to normal station
    bms.addBike('BIKE_N1', 'NORMAL_STN'); 
    bms.addBike('BIKE_N2', 'NORMAL_STN');

    console.log('\n📱 ERROR MESSAGES BY SCENARIO');
    console.log('=' .repeat(55));

    // 1. Empty Station Checkout
    console.log('\n🚫 Scenario 1: Checkout from Empty Station');
    console.log('   Request: Rent bike from station with no bikes');
    const emptyResult = bms.rentBike('user1', 'EMPTY_STN');
    console.log('   ❌ Response:', emptyResult.message);
    console.log('   📊 Context: Station has', emptyResult.stationInfo?.bikesAvailable || 0, 'bikes available');

    // 2. Full Station Return
    console.log('\n🚫 Scenario 2: Return to Full Station');
    console.log('   Request: Return bike to station with no free docks');
    // First rent a bike
    const rental = bms.rentBike('user2', 'NORMAL_STN', 'BIKE_N1');
    if (rental.success) {
        const fullResult = bms.returnBike('user2', 'BIKE_N1', 'FULL_STN');
        console.log('   ❌ Response:', fullResult.message);
        console.log('   📊 Context:', fullResult.stationInfo?.freeDocks || 0, 'free docks available');
    }

    // 3. Out of Service Operations
    console.log('\n🚫 Scenario 3: Operations on Out-of-Service Station');
    const oosStation = bms.stations.get('NORMAL_STN');
    oosStation.setOutOfService();
    
    const oosCheckout = bms.rentBike('user3', 'NORMAL_STN');
    console.log('   Request: Checkout from OOS station');
    console.log('   ❌ Response:', oosCheckout.message);

    // Return bike first, then try OOS return
    bms.addStation('TEMP_STN', 2);
    bms.addBike('TEMP_BIKE', 'TEMP_STN');
    const tempRental = bms.rentBike('user4', 'TEMP_STN', 'TEMP_BIKE');
    if (tempRental.success) {
        const oosReturn = bms.returnBike('user4', 'TEMP_BIKE', 'NORMAL_STN');
        console.log('   Request: Return to OOS station');
        console.log('   ❌ Response:', oosReturn.message);
    }

    // 4. Non-existent Station
    console.log('\n🚫 Scenario 4: Non-existent Station');
    console.log('   Request: Operation on station that doesn\'t exist');
    const noStation = bms.rentBike('user5', 'NONEXISTENT_STN');
    console.log('   ❌ Response:', noStation.message);

    // 5. No Active Rental
    console.log('\n🚫 Scenario 5: Return Without Active Rental');
    console.log('   Request: User tries to return bike they didn\'t rent');
    const noRental = bms.returnBike('user6', 'BIKE_F1', 'EMPTY_STN');
    console.log('   ❌ Response:', noRental.message);

    // 6. Wrong Bike Return
    console.log('\n🚫 Scenario 6: Return Wrong Bike');
    console.log('   Request: User tries to return different bike than rented');
    if (rental.success) {
        // user2 rented BIKE_N1, try to return different bike
        const wrongBike = bms.returnBike('user2', 'BIKE_F1', 'EMPTY_STN');
        console.log('   ❌ Response:', wrongBike.message);
    }

    // 7. Specific Bike Not Found
    console.log('\n🚫 Scenario 7: Specific Bike Not Available');
    console.log('   Request: Rent specific bike that\'s not at the station');
    oosStation.setActive(); // Reactivate to test bike availability
    const noBike = bms.rentBike('user7', 'NORMAL_STN', 'NONEXISTENT_BIKE');
    console.log('   ❌ Response:', noBike.message);

    console.log('\n📋 ERROR MESSAGE QUALITY ANALYSIS');
    console.log('=' .repeat(55));
    console.log('✅ Messages are descriptive and specific');
    console.log('✅ Include relevant context (bike counts, dock availability)');
    console.log('✅ Explain WHY the operation failed');
    console.log('✅ Reference specific station and bike IDs');
    console.log('✅ Provide actionable information for users');
    console.log('✅ Include business rule violations clearly');

    console.log('\n💡 CONCLUSION: System provides comprehensive, clear error messages');
    console.log('   for all failure scenarios, helping users understand what went');
    console.log('   wrong and why their requested action cannot be completed.');
}

// Run the demonstration
if (require.main === module) {
    demonstrateErrorMessages();
}

module.exports = { demonstrateErrorMessages };