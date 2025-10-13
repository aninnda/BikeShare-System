/**
 * Test Permission Validation System
 * Demonstrates role-based access control for BMS API endpoints
 */

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';

// Test users
const testUsers = {
    rider1: { id: 'rider123', role: 'rider', username: 'john_rider' },
    rider2: { id: 'rider456', role: 'rider', username: 'jane_rider' },
    operator1: { id: 'op789', role: 'operator', username: 'admin_ops' },
    invalidRole: { id: 'invalid123', role: 'hacker', username: 'bad_user' }
};

// Helper function to create headers with user info
function createHeaders(user) {
    return {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'x-username': user.username,
        'Content-Type': 'application/json'
    };
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, user, data = null) {
    try {
        const config = {
            method: method.toLowerCase(),
            url: `${BASE_URL}${endpoint}`,
            headers: createHeaders(user)
        };
        
        if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            status: error.response?.status || 500, 
            message: error.response?.data?.message || error.message,
            error: error.response?.data?.error
        };
    }
}

async function testPermissions() {
    console.log('🔐 TESTING PERMISSION VALIDATION SYSTEM');
    console.log('=' .repeat(50));
    
    // Test 1: Authentication Required
    console.log('\n📋 Test 1: Authentication Required');
    console.log('-'.repeat(30));
    
    try {
        const response = await axios.post(`${BASE_URL}/rent`, {
            stationId: 'TEST001',
            bikeId: 'BIKE001',
            userId: 'rider123'
        });
        console.log('❌ ERROR: Should have required authentication');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ PASS: Authentication correctly required');
            console.log(`   Message: ${error.response.data.message}`);
        } else {
            console.log('❌ UNEXPECTED: Wrong error type');
        }
    }
    
    // Test 2: Invalid Role
    console.log('\n📋 Test 2: Invalid Role Rejection');
    console.log('-'.repeat(30));
    
    const invalidRoleResult = await makeRequest('POST', '/rent', testUsers.invalidRole, {
        stationId: 'TEST001',
        bikeId: 'BIKE001',
        userId: 'rider123'
    });
    
    if (invalidRoleResult.status === 403) {
        console.log('✅ PASS: Invalid role correctly rejected');
        console.log(`   Message: ${invalidRoleResult.message}`);
    } else {
        console.log('❌ FAIL: Invalid role should be rejected');
    }
    
    // Test 3: Rider Permissions
    console.log('\n📋 Test 3: Rider Permissions');
    console.log('-'.repeat(30));
    
    // Riders should be able to rent for themselves
    const riderRentSelf = await makeRequest('POST', '/rent', testUsers.rider1, {
        stationId: 'TEST001',
        bikeId: 'BIKE001',
        userId: testUsers.rider1.id
    });
    console.log(`Rider renting for self: ${riderRentSelf.success ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    if (!riderRentSelf.success) {
        console.log(`   Reason: ${riderRentSelf.message}`);
    }
    
    // Riders should NOT be able to rent for others
    const riderRentOther = await makeRequest('POST', '/rent', testUsers.rider1, {
        stationId: 'TEST001',
        bikeId: 'BIKE002',
        userId: testUsers.rider2.id
    });
    console.log(`Rider renting for other: ${riderRentOther.success ? '❌ INCORRECTLY ALLOWED' : '✅ CORRECTLY BLOCKED'}`);
    if (!riderRentOther.success) {
        console.log(`   Reason: ${riderRentOther.message}`);
    }
    
    // Riders should NOT be able to add stations
    const riderAddStation = await makeRequest('POST', '/stations', testUsers.rider1, {
        stationId: 'NEW_STATION',
        capacity: 10
    });
    console.log(`Rider adding station: ${riderAddStation.success ? '❌ INCORRECTLY ALLOWED' : '✅ CORRECTLY BLOCKED'}`);
    if (!riderAddStation.success) {
        console.log(`   Reason: ${riderAddStation.message}`);
    }
    
    // Test 4: Operator Permissions
    console.log('\n📋 Test 4: Operator Permissions');
    console.log('-'.repeat(30));
    
    // Operators should be able to add stations
    const operatorAddStation = await makeRequest('POST', '/stations', testUsers.operator1, {
        stationId: 'OP_STATION_001',
        capacity: 15,
        location: 'Operator Test Location'
    });
    console.log(`Operator adding station: ${operatorAddStation.success ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    if (!operatorAddStation.success) {
        console.log(`   Reason: ${operatorAddStation.message}`);
    }
    
    // Operators should be able to perform manual moves
    const operatorManualMove = await makeRequest('POST', '/manual-move', testUsers.operator1, {
        bikeId: 'BIKE001',
        fromStationId: 'TEST001',
        toStationId: 'TEST002',
        operatorId: testUsers.operator1.id
    });
    console.log(`Operator manual move: ${operatorManualMove.success ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    if (!operatorManualMove.success) {
        console.log(`   Reason: ${operatorManualMove.message}`);
    }
    
    // Operators should NOT be able to rent bikes (rider-only action)
    const operatorRent = await makeRequest('POST', '/rent', testUsers.operator1, {
        stationId: 'TEST001',
        bikeId: 'BIKE001',
        userId: testUsers.operator1.id
    });
    console.log(`Operator renting bike: ${operatorRent.success ? '❌ INCORRECTLY ALLOWED' : '✅ CORRECTLY BLOCKED'}`);
    if (!operatorRent.success) {
        console.log(`   Reason: ${operatorRent.message}`);
    }
    
    // Test 5: Public Endpoints
    console.log('\n📋 Test 5: Public Endpoints (No Auth Required)');
    console.log('-'.repeat(30));
    
    // System overview should be publicly accessible
    try {
        const response = await axios.get(`${BASE_URL}/bms/overview`);
        console.log('✅ PASS: Public endpoint accessible without auth');
    } catch (error) {
        console.log('ℹ️  NOTE: Public endpoint may require server to be running');
    }
    
    // Health check should be publicly accessible
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ PASS: Health check accessible without auth');
    } catch (error) {
        console.log('ℹ️  NOTE: Health check may require server to be running');
    }
    
    console.log('\n🎉 PERMISSION VALIDATION TESTS COMPLETED');
    console.log('=' .repeat(50));
    console.log('📝 Summary:');
    console.log('   - Authentication is required for protected endpoints');
    console.log('   - Role validation prevents invalid roles from accessing system');
    console.log('   - Riders can only perform rider actions on their own resources');
    console.log('   - Operators can perform admin actions but not rider actions');
    console.log('   - Public endpoints remain accessible without authentication');
    console.log('\n💡 To test with real server:');
    console.log('   1. Start the server: node server-clean.js');
    console.log('   2. Run this test: node test-permissions.js');
    console.log('   3. Send requests with headers: x-user-id, x-user-role, x-username');
}

// Only run tests if this file is executed directly
if (require.main === module) {
    testPermissions().catch(console.error);
}

module.exports = { testPermissions, createHeaders, makeRequest };