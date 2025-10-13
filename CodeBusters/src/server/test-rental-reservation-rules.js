/**
 * Test script to validate the business rule: 
 * Users cannot rent and reserve bikes simultaneously.
 * If they have a rental, they cannot reserve.
 * If they have a reservation, they can only rent the reserved bike.
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(data)
                    };
                    resolve(response);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

// Test configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 5000;

// Test user credentials (you may need to register this user first)
const testUser = {
    username: 'testuser_business_rules',
    password: 'testpass123'
};

async function runTests() {
    console.log('🧪 Testing Business Rules: Rent/Reserve Constraints');
    console.log('='.repeat(60));

    try {
        // Step 1: Register test user
        console.log('\n📝 Step 1: Registering test user...');
        const registerResponse = await makeRequest({
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }, testUser);

        if (registerResponse.statusCode === 200 || registerResponse.statusCode === 409) {
            console.log('✅ User registration successful or user already exists');
        } else {
            console.log('❌ User registration failed:', registerResponse.body);
            return;
        }

        // Step 2: Login to get authentication token
        console.log('\n🔐 Step 2: Logging in...');
        const loginResponse = await makeRequest({
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }, testUser);

        if (loginResponse.statusCode !== 200) {
            console.log('❌ Login failed:', loginResponse.body);
            return;
        }

        const userId = loginResponse.body.user.id;
        console.log('✅ Login successful. User ID:', userId);

        // Create auth headers based on the middleware requirements
        const authHeaders = {
            'Content-Type': 'application/json',
            'X-User-ID': userId.toString(),
            'X-User-Role': 'rider',
            'X-Username': loginResponse.body.user.username
        };

        // Step 3: Test making a reservation
        console.log('\n📋 Step 3: Testing reservation...');
        const reserveResponse = await makeRequest({
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/reserve',
            method: 'POST',
            headers: authHeaders
        }, {
            stationId: 'STN001',
            bikeId: 'BIKE001'
        });

        console.log('Reserve Response Status:', reserveResponse.statusCode);
        console.log('Reserve Response Body:', reserveResponse.body);

        if (reserveResponse.statusCode === 200) {
            console.log('✅ Reservation successful');
            
            // Step 4: Try to make another reservation (should fail)
            console.log('\n🚫 Step 4: Testing second reservation (should fail)...');
            const secondReserveResponse = await makeRequest({
                hostname: SERVER_HOST,
                port: SERVER_PORT,
                path: '/api/reserve',
                method: 'POST',
                headers: authHeaders
            }, {
                stationId: 'STN001',
                bikeId: 'BIKE002'
            });

            console.log('Second Reserve Status:', secondReserveResponse.statusCode);
            console.log('Second Reserve Body:', secondReserveResponse.body);

            if (secondReserveResponse.statusCode === 409) {
                console.log('✅ Second reservation correctly blocked');
            } else {
                console.log('❌ Second reservation should have been blocked');
            }

            // Step 5: Try to rent a different bike (should fail)
            console.log('\n🚫 Step 5: Testing rent different bike (should fail)...');
            const rentDifferentResponse = await makeRequest({
                hostname: SERVER_HOST,
                port: SERVER_PORT,
                path: '/api/rent',
                method: 'POST',
                headers: authHeaders
            }, {
                stationId: 'STN001',
                bikeId: 'BIKE002',
                userId: userId
            });

            console.log('Rent Different Bike Status:', rentDifferentResponse.statusCode);
            console.log('Rent Different Bike Body:', rentDifferentResponse.body);

            if (rentDifferentResponse.statusCode === 409) {
                console.log('✅ Renting different bike correctly blocked');
            } else {
                console.log('❌ Renting different bike should have been blocked');
            }

            // Step 6: Try to rent the reserved bike (should succeed)
            console.log('\n✅ Step 6: Testing rent reserved bike (should succeed)...');
            const rentReservedResponse = await makeRequest({
                hostname: SERVER_HOST,
                port: SERVER_PORT,
                path: '/api/rent',
                method: 'POST',
                headers: authHeaders
            }, {
                stationId: 'STN001',
                bikeId: 'BIKE001',
                userId: userId
            });

            console.log('Rent Reserved Bike Status:', rentReservedResponse.statusCode);
            console.log('Rent Reserved Bike Body:', rentReservedResponse.body);

            if (rentReservedResponse.statusCode === 200) {
                console.log('✅ Renting reserved bike successful');
                
                // Step 7: Try to make a reservation while having an active rental (should fail)
                console.log('\n🚫 Step 7: Testing reservation with active rental (should fail)...');
                const reserveWithRentalResponse = await makeRequest({
                    hostname: SERVER_HOST,
                    port: SERVER_PORT,
                    path: '/api/reserve',
                    method: 'POST',
                    headers: authHeaders
                }, {
                    stationId: 'STN001',
                    bikeId: 'BIKE002'
                });

                console.log('Reserve With Rental Status:', reserveWithRentalResponse.statusCode);
                console.log('Reserve With Rental Body:', reserveWithRentalResponse.body);

                if (reserveWithRentalResponse.statusCode === 409) {
                    console.log('✅ Reservation with active rental correctly blocked');
                } else {
                    console.log('❌ Reservation with active rental should have been blocked');
                }

                // Clean up: Return the bike
                console.log('\n🔄 Step 8: Returning bike to clean up...');
                const returnResponse = await makeRequest({
                    hostname: SERVER_HOST,
                    port: SERVER_PORT,
                    path: '/api/return',
                    method: 'POST',
                    headers: authHeaders
                }, {
                    stationId: 'STN001',
                    bikeId: 'BIKE001',
                    userId: userId
                });

                console.log('Return Status:', returnResponse.statusCode);
                if (returnResponse.statusCode === 200) {
                    console.log('✅ Bike returned successfully');
                } else {
                    console.log('⚠️ Bike return failed:', returnResponse.body);
                }
            } else {
                console.log('❌ Renting reserved bike failed');
            }

        } else {
            console.log('❌ Initial reservation failed');
        }

        console.log('\n🎉 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the tests
runTests();