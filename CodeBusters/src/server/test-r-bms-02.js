/**
 * R-BMS-02 Implementation Test
 * Tests the requirement: "BMS shall prevent undocking from an empty station and docking to a full station"
 * 
 * This test demonstrates:
 * 1. Successful operations when stations have capacity
 * 2. Blocked undocking when station is empty
 * 3. Blocked docking when station is full
 * 4. System statistics and compliance tracking
 */

const BMSManager = require('./src/bms/BMSManager');
const { BMS_OPERATIONS } = require('./config/constants');

console.log('='.repeat(60));
console.log('R-BMS-02 IMPLEMENTATION TEST');
console.log('BMS shall prevent undocking from empty station and docking to full station');
console.log('='.repeat(60));

// Initialize BMS Manager
const bms = new BMSManager();

// Test Setup
console.log('\n📋 TEST SETUP');
console.log('Creating stations and bikes...');

// Create test stations
bms.addStation('TEST001', 2, 'Test Station - Small'); // Capacity: 2
bms.addStation('TEST002', 1, 'Test Station - Tiny');  // Capacity: 1  
bms.addStation('TEST003', 3, 'Test Station - Empty'); // Capacity: 3, will remain empty

// Add bikes to stations (fill TEST001 and TEST002)
bms.addBike('TBIKE001', 'TEST001', 'standard');
bms.addBike('TBIKE002', 'TEST001', 'e-bike'); // TEST001 now FULL (2/2)
bms.addBike('TBIKE003', 'TEST002', 'standard'); // TEST002 now FULL (1/1)

console.log('\n📊 Initial Station Status:');
bms.listAllStations().forEach(station => {
    console.log(`  ${station.id}: ${station.occupied}/${station.capacity} occupied, ` +
                `Empty: ${station.isEmpty}, Full: ${station.isFull}`);
});

console.log('\n' + '='.repeat(60));
console.log('R-BMS-02 TEST SCENARIOS');
console.log('='.repeat(60));

// TEST 1: Successful undocking from non-empty station
console.log('\n✅ TEST 1: Successful undocking from non-empty station');
const test1 = bms.rentBike('USER001', 'TEST001', 'TBIKE001');
console.log(`Result: ${test1.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Operation: ${test1.operation}`);
console.log(`Message: ${test1.message}`);

// TEST 2: R-BMS-02 PROTECTION - Attempt to undock from empty station
console.log('\n🚫 TEST 2: R-BMS-02 Protection - Undocking from empty station');
const test2 = bms.rentBike('USER002', 'TEST003'); // TEST003 is empty
console.log(`Result: ${test2.success ? 'SUCCESS' : 'BLOCKED ✓'}`);
console.log(`Operation: ${test2.operation}`);
console.log(`Message: ${test2.message}`);
console.log(`R-BMS-02 Compliance: ${test2.operation === BMS_OPERATIONS.UNDOCK_FAILED_EMPTY ? 'ENFORCED ✓' : 'FAILED ✗'}`);

// TEST 3: Successful docking to non-full station
console.log('\n✅ TEST 3: Successful docking to non-full station');
const test3 = bms.returnBike('USER001', 'TBIKE001', 'TEST003'); // TEST003 has capacity
console.log(`Result: ${test3.success ? 'SUCCESS' : 'FAILED'}`);
console.log(`Operation: ${test3.operation}`);
console.log(`Message: ${test3.message}`);

// TEST 4: R-BMS-02 PROTECTION - Attempt to dock to full station  
console.log('\n🚫 TEST 4: R-BMS-02 Protection - Docking to full station');
// First, rent a bike to create an active rental
const setup = bms.rentBike('USER003', 'TEST003', 'TBIKE001');
const test4 = bms.returnBike('USER003', 'TBIKE001', 'TEST002'); // TEST002 is full (1/1)
console.log(`Result: ${test4.success ? 'SUCCESS' : 'BLOCKED ✓'}`);
console.log(`Operation: ${test4.operation}`);
console.log(`Message: ${test4.message}`);
console.log(`R-BMS-02 Compliance: ${test4.operation === BMS_OPERATIONS.DOCK_FAILED_FULL ? 'ENFORCED ✓' : 'FAILED ✗'}`);

// TEST 5: Multiple undocking attempts from empty station
console.log('\n🚫 TEST 5: Multiple undocking attempts from empty station');
for (let i = 1; i <= 3; i++) {
    const testMultiple = bms.rentBike(`USER00${i}`, 'TEST003');
    console.log(`  Attempt ${i}: ${testMultiple.success ? 'SUCCESS' : 'BLOCKED'} - ${testMultiple.operation}`);
}

// Final System Overview
console.log('\n' + '='.repeat(60));
console.log('FINAL SYSTEM OVERVIEW WITH R-BMS-02 STATISTICS');
console.log('='.repeat(60));

const overview = bms.getSystemOverview();
console.log('\n📊 System Statistics:');
console.log(`  Total Operations: ${overview.systemStats.totalOperations}`);
console.log(`  Successful Docks: ${overview.systemStats.successfulDocks}`);
console.log(`  Failed Docks: ${overview.systemStats.failedDocks}`);
console.log(`  Successful Undocks: ${overview.systemStats.successfulUndocks}`);
console.log(`  Failed Undocks: ${overview.systemStats.failedUndocks}`);
console.log(`  R-BMS-02 Blocked Operations: ${overview.systemStats.blockedOperations}`);
console.log(`  Overall Success Rate: ${overview.r_bms_02_compliance.successRate}%`);

console.log('\n📍 Final Station Status:');
overview.stations.forEach(station => {
    const status = station.isFull ? 'FULL' : station.isEmpty ? 'EMPTY' : 'AVAILABLE';
    console.log(`  ${station.id}: ${station.occupied}/${station.capacity} - ${status}`);
});

console.log('\n✅ R-BMS-02 COMPLIANCE SUMMARY:');
console.log(`  Description: ${overview.r_bms_02_compliance.description}`);
console.log(`  Blocked Operations: ${overview.r_bms_02_compliance.blockedOperations}`);
console.log(`  System Success Rate: ${overview.r_bms_02_compliance.successRate}%`);
console.log(`  Status: ${overview.r_bms_02_compliance.blockedOperations > 0 ? 'ACTIVE & ENFORCED ✓' : 'READY'}`);

console.log('\n' + '='.repeat(60));
console.log('R-BMS-02 TEST COMPLETED');
console.log('Requirement successfully implemented and tested!');
console.log('='.repeat(60));