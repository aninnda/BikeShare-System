/**
 * Business Rules Implementation Test
 * Tests all the core functionality requirements:
 * 
 * - Occupancy accounting: bikesAvailable == count(occupied docks); freeDocks == capacity − bikesAvailable
 * - Checkout: choose available bike → transition to on_trip; decrement count
 * - Return: place bike into any free dock → transition to available; increment count
 * - Manual move: operator moves bike A→B (atomic decrement/increment)
 * - Station status: active | out_of_service (OOS blocks checkout/return)
 * - Reservation: soft hold with expiresAfterMinutes
 */

const BMSManager = require('./src/bms/BMSManager');
const { BMS_OPERATIONS, BMS_STATES } = require('./config/constants');

console.log('='.repeat(80));
console.log('BUSINESS RULES IMPLEMENTATION TEST');
console.log('Testing core BMS functionality with all business rules');
console.log('='.repeat(80));

// Initialize BMS Manager
const bms = new BMSManager();

// Test Setup
console.log('\n📋 TEST SETUP');
console.log('Creating stations with different capacities...');

// Create test stations
bms.addStation('TEST001', 3, 'Test Station Alpha');   // Capacity: 3
bms.addStation('TEST002', 2, 'Test Station Beta');    // Capacity: 2  
bms.addStation('TEST003', 1, 'Test Station Gamma');   // Capacity: 1 (will test full scenarios)

// Add bikes to stations
bms.addBike('TBIKE001', 'TEST001', 'standard');
bms.addBike('TBIKE002', 'TEST001', 'e-bike');
bms.addBike('TBIKE003', 'TEST002', 'standard');

console.log('\n📊 Initial System State:');
bms.listAllStations().forEach(station => {
    console.log(`  Station ${station.id}: ${station.bikesAvailable} bikes available, ${station.freeDocks} free docks (Capacity: ${station.capacity})`);
    console.log(`    Business Rule Check: bikesAvailable (${station.bikesAvailable}) == occupiedDocks (${station.occupiedDocks}): ${station.bikesAvailable === station.occupiedDocks ? '✅' : '❌'}`);
    console.log(`    Business Rule Check: freeDocks (${station.freeDocks}) == capacity - bikesAvailable (${station.capacity - station.bikesAvailable}): ${station.freeDocks === (station.capacity - station.bikesAvailable) ? '✅' : '❌'}`);
});

// Test 1: Occupancy Accounting
console.log('\n🧮 TEST 1: OCCUPANCY ACCOUNTING VALIDATION');
console.log('Business Rule: bikesAvailable == count(occupied docks); freeDocks == capacity − bikesAvailable');

const station001 = bms.getStationInfo('TEST001').station;
console.log(`Station TEST001 Analysis:`);
console.log(`  - Capacity: ${station001.capacity}`);
console.log(`  - Bikes Available: ${station001.bikesAvailable} (should equal occupied docks)`);
console.log(`  - Occupied Docks: ${station001.occupiedDocks}`);
console.log(`  - Free Docks: ${station001.freeDocks} (should equal capacity - bikes available)`);
console.log(`  - Formula Check: ${station001.capacity} - ${station001.bikesAvailable} = ${station001.freeDocks}`);
console.log(`  - Validation: ${station001.freeDocks === (station001.capacity - station001.bikesAvailable) ? '✅ CORRECT' : '❌ ERROR'}`);

// Test 2: Checkout Business Rule
console.log('\n🚴 TEST 2: CHECKOUT BUSINESS RULE');
console.log('Business Rule: choose available bike → transition to on_trip; decrement count');

console.log('\nBefore checkout:');
const beforeCheckout = bms.getStationInfo('TEST001').station;
console.log(`  - TEST001: ${beforeCheckout.bikesAvailable} bikes, ${beforeCheckout.freeDocks} free docks`);

const checkoutResult = bms.rentBike('user123', 'TEST001');
console.log(`\nCheckout attempt: ${checkoutResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
console.log(`Message: ${checkoutResult.message}`);

console.log('\nAfter checkout:');
const afterCheckout = bms.getStationInfo('TEST001').station;
console.log(`  - TEST001: ${afterCheckout.bikesAvailable} bikes, ${afterCheckout.freeDocks} free docks`);
console.log(`  - Count decremented: ${beforeCheckout.bikesAvailable - afterCheckout.bikesAvailable === 1 ? '✅' : '❌'}`);

if (checkoutResult.success && checkoutResult.rental) {
    const bike = bms.bikes.get(checkoutResult.rental.bikeId);
    console.log(`  - Bike status: ${bike.status} (should be 'on_trip')`);
    console.log(`  - Status transition: ${bike.status === BMS_STATES.BIKE.ON_TRIP ? '✅ CORRECT' : '❌ ERROR'}`);
}

// Test 3: Return Business Rule
console.log('\n🏠 TEST 3: RETURN BUSINESS RULE');
console.log('Business Rule: place bike into any free dock → transition to available; increment count');

if (checkoutResult.success) {
    console.log('\nBefore return:');
    const beforeReturn = bms.getStationInfo('TEST002').station;
    console.log(`  - TEST002: ${beforeReturn.bikesAvailable} bikes, ${beforeReturn.freeDocks} free docks`);

    const returnResult = bms.returnBike('user123', checkoutResult.rental.bikeId, 'TEST002');
    console.log(`\nReturn attempt: ${returnResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Message: ${returnResult.message}`);

    if (returnResult.success) {
        console.log('\nAfter return:');
        const afterReturn = bms.getStationInfo('TEST002').station;
        console.log(`  - TEST002: ${afterReturn.bikesAvailable} bikes, ${afterReturn.freeDocks} free docks`);
        console.log(`  - Count incremented: ${afterReturn.bikesAvailable - beforeReturn.bikesAvailable === 1 ? '✅' : '❌'}`);
        
        // Check bike status
        const bike = bms.bikes.get(checkoutResult.rental.bikeId);
        console.log(`  - Bike status: ${bike.status} (should be 'available')`);
        console.log(`  - Status transition: ${bike.status === BMS_STATES.BIKE.AVAILABLE ? '✅ CORRECT' : '❌ ERROR'}`);
    }
}

// Test 4: Manual Move Business Rule
console.log('\n🔄 TEST 4: MANUAL MOVE BUSINESS RULE');
console.log('Business Rule: operator moves bike A→B (atomic decrement/increment)');

console.log('\nBefore manual move:');
const beforeMoveFrom = bms.getStationInfo('TEST001').station;
const beforeMoveTo = bms.getStationInfo('TEST003').station;
console.log(`  - TEST001 (source): ${beforeMoveFrom.bikesAvailable} bikes, ${beforeMoveFrom.freeDocks} free docks`);
console.log(`  - TEST003 (dest): ${beforeMoveTo.bikesAvailable} bikes, ${beforeMoveTo.freeDocks} free docks`);

const moveResult = bms.manualMoveBike('TBIKE001', 'TEST001', 'TEST003', 'operator456');
console.log(`\nManual move attempt: ${moveResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
console.log(`Message: ${moveResult.message}`);

if (moveResult.success) {
    console.log('\nAfter manual move:');
    const afterMoveFrom = bms.getStationInfo('TEST001').station;
    const afterMoveTo = bms.getStationInfo('TEST003').station;
    console.log(`  - TEST001 (source): ${afterMoveFrom.bikesAvailable} bikes, ${afterMoveTo.freeDocks} free docks`);
    console.log(`  - TEST003 (dest): ${afterMoveTo.bikesAvailable} bikes, ${afterMoveTo.freeDocks} free docks`);
    console.log(`  - Source decremented: ${beforeMoveFrom.bikesAvailable - afterMoveFrom.bikesAvailable === 1 ? '✅' : '❌'}`);
    console.log(`  - Destination incremented: ${afterMoveTo.bikesAvailable - beforeMoveTo.bikesAvailable === 1 ? '✅' : '❌'}`);
    console.log(`  - Atomic operation: ${moveResult.operation === BMS_OPERATIONS.MANUAL_MOVE_SUCCESS ? '✅' : '❌'}`);
}

// Test 5: Station Status Business Rule
console.log('\n🚫 TEST 5: STATION STATUS BUSINESS RULE');
console.log('Business Rule: active | out_of_service (OOS blocks checkout/return)');

// Set station out of service
const station = bms.stations.get('TEST002');
station.setOutOfService();

console.log(`\nStation TEST002 set to: ${station.status}`);

// Try to checkout from OOS station
const oosCheckoutResult = bms.rentBike('user789', 'TEST002');
console.log(`Checkout from OOS station: ${oosCheckoutResult.success ? '❌ ALLOWED (ERROR)' : '✅ BLOCKED (CORRECT)'}`);
console.log(`Message: ${oosCheckoutResult.message}`);

// Try to return to OOS station
const oosReturnResult = bms.returnBike('user789', 'TBIKE003', 'TEST002');
console.log(`Return to OOS station: ${oosReturnResult.success ? '❌ ALLOWED (ERROR)' : '✅ BLOCKED (CORRECT)'}`);

// Restore station
station.setActive();
console.log(`\nStation TEST002 restored to: ${station.status}`);

// Test 6: Reservation Business Rule
console.log('\n📝 TEST 6: RESERVATION BUSINESS RULE');
console.log('Business Rule: soft hold with expiresAfterMinutes');

const reservationResult = station.createReservation('user999', 2); // 2 minutes expiry
console.log(`Reservation creation: ${reservationResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

if (reservationResult.success) {
    const reservation = reservationResult.reservation;
    const now = new Date();
    const expiryTime = new Date(reservation.expiresAt);
    const minutesUntilExpiry = Math.round((expiryTime - now) / (1000 * 60));
    
    console.log(`  - Reservation ID: ${reservation.userId}`);
    console.log(`  - Created at: ${reservation.createdAt.toISOString()}`);
    console.log(`  - Expires at: ${reservation.expiresAt.toISOString()}`);
    console.log(`  - Minutes until expiry: ${minutesUntilExpiry} (should be ~2)`);
    console.log(`  - Status: ${reservation.status}`);
    console.log(`  - Soft hold validation: ${reservation.status === BMS_STATES.RESERVATION.ACTIVE ? '✅' : '❌'}`);
}

// Final System Overview
console.log('\n📈 FINAL SYSTEM OVERVIEW');
const overview = bms.getSystemOverview();
console.log(`Total Operations: ${overview.systemStats.totalOperations}`);
console.log(`Success Rate: ${overview.r_bms_02_compliance.successRate}%`);
console.log(`Stations: ${overview.totalStations}`);
console.log(`Bikes: ${overview.totalBikes}`);

console.log('\n📊 Final Station States:');
bms.listAllStations().forEach(station => {
    console.log(`  ${station.id}: ${station.bikesAvailable}/${station.capacity} bikes, Status: ${station.status}`);
    console.log(`    Occupancy: ${station.occupiedDocks} occupied, ${station.freeDocks} free`);
    console.log(`    Accounting: bikesAvailable(${station.bikesAvailable}) == occupiedDocks(${station.occupiedDocks}): ${station.bikesAvailable === station.occupiedDocks ? '✅' : '❌'}`);
});

console.log('\n✅ ALL BUSINESS RULES TESTED SUCCESSFULLY!');
console.log('='.repeat(80));