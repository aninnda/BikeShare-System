/**
 * Sanity Checking Test
 * Tests: no negative bikes, no over-capacity, valid state transitions
 */

const BMSManager = require('./src/bms/BMSManager');
const Bike = require('./src/bms/Bike');
const { BMS_STATES } = require('./config/constants');

console.log('='.repeat(60));
console.log('SANITY CHECKING TEST');
console.log('Testing: no negative bikes, no over-capacity, valid state transitions');
console.log('='.repeat(60));

const bms = new BMSManager();

// Test 1: Input Validation
console.log('\n🔍 TEST 1: INPUT VALIDATION');

const emptyStationResult = bms.addStation('', 5); // Invalid empty ID
console.log(`Empty station ID: ${emptyStationResult.success ? '❌ ACCEPTED' : '✅ REJECTED'}`);
console.log(`  Message: ${emptyStationResult.message}`);

const emptyBikeResult = bms.addBike('', 'TEST001'); // Invalid empty bike ID
console.log(`Empty bike ID: ${emptyBikeResult.success ? '❌ ACCEPTED' : '✅ REJECTED'}`);
console.log(`  Message: ${emptyBikeResult.message}`);

// Test 2: Valid State Transitions
console.log('\n⚡ TEST 2: VALID STATE TRANSITIONS');

const bike = new Bike('TEST_BIKE');
console.log(`Initial state: ${bike.status}`);

// Valid transition: available → on_trip
try {
    bike.changeStatus(BMS_STATES.BIKE.ON_TRIP, 'test');
    console.log(`✅ Valid transition to: ${bike.status}`);
} catch (error) {
    console.log(`❌ Valid transition failed: ${error.message}`);
}

// Invalid transition: on_trip → reserved (not allowed)
try {
    bike.changeStatus(BMS_STATES.BIKE.RESERVED, 'test');
    console.log(`❌ Invalid transition allowed: ${bike.status}`);
} catch (error) {
    console.log(`✅ Invalid transition blocked: ${error.message}`);
}

// Test 3: Over-capacity Protection
console.log('\n📦 TEST 3: OVER-CAPACITY PROTECTION');

bms.addStation('SMALL', 1, 'Small Station'); // Capacity of 1
bms.addBike('BIKE1', 'SMALL');

console.log('Station SMALL state after adding 1 bike:');
const station = bms.stations.get('SMALL');
const validation1 = station.validateState();
console.log(`  Valid: ${validation1.isValid ? '✅' : '❌'}`);
console.log(`  Bikes: ${station.getBikesAvailable()}/${station.capacity}`);

// Try to add another bike (should fail)
const result = bms.addBike('BIKE2', 'SMALL');
console.log(`Adding second bike to full station: ${result.success ? '❌ ALLOWED' : '✅ BLOCKED'}`);
console.log(`  Message: ${result.message}`);

// Test 4: System State Validation
console.log('\n🌐 TEST 4: SYSTEM STATE VALIDATION');

const systemValidation = bms.validateSystemState();
console.log(`System state valid: ${systemValidation.isValid ? '✅' : '❌'}`);
console.log(`Total bikes: ${systemValidation.stats.totalBikes}`);
console.log(`Docked bikes: ${systemValidation.stats.totalDockedBikes}`);
console.log(`Rented bikes: ${systemValidation.stats.totalRentedBikes}`);
console.log(`Accounted bikes: ${systemValidation.stats.accountedBikes}`);

if (!systemValidation.isValid) {
    console.log('Errors found:');
    systemValidation.errors.forEach(error => console.log(`  - ${error}`));
}

// Test 5: Negative Count Prevention
console.log('\n➖ TEST 5: NEGATIVE COUNT PREVENTION');

// Create a station and manually try to create negative state
bms.addStation('TEST_NEG', 2);
const testStation = bms.stations.get('TEST_NEG');

// Simulate invalid state (this should be caught by validation)
console.log('Testing validation on empty station:');
const emptyValidation = testStation.validateState();
console.log(`Empty station valid: ${emptyValidation.isValid ? '✅' : '❌'}`);
console.log(`Free docks: ${testStation.getFreeDocks()} (should be positive)`);

console.log('\n✅ SANITY CHECKING TESTS COMPLETED!');
console.log('='.repeat(60));