/**
 * Permission System Usage Examples
 * Shows how to make authenticated requests to the BMS API
 */

// Example: Making authenticated requests using curl or HTTP clients

console.log('🔐 BMS API PERMISSION SYSTEM USAGE GUIDE');
console.log('=' .repeat(50));

console.log('\n📋 Required Headers for Authentication:');
console.log('   x-user-id: Your user ID (e.g., "rider123")');
console.log('   x-user-role: Your role ("rider" or "operator")');  
console.log('   x-username: Your username (optional, for logging)');

console.log('\n🚲 Rider Endpoints (require rider role):');
console.log('   POST /api/rent - Rent a bike');
console.log('   POST /api/return - Return a bike');

console.log('\n👨‍💼 Operator Endpoints (require operator role):');
console.log('   POST /api/bikes - Add new bike');
console.log('   POST /api/stations - Add new station');
console.log('   POST /api/manual-move - Move bike between stations');
console.log('   POST /api/stations/:id/maintenance - Toggle station maintenance');

console.log('\n🌍 Public Endpoints (no authentication required):');
console.log('   GET /api/health - Health check');
console.log('   GET /api/bms/overview - System overview');
console.log('   GET /api/bikes - List bikes');
console.log('   GET /api/stations - List stations');
console.log('   POST /api/register - User registration');
console.log('   POST /api/login - User login');

console.log('\n📝 Example Requests:');

console.log('\n1. Rider renting a bike:');
console.log(`
curl -X POST http://localhost:5000/api/rent \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: rider123" \\
  -H "x-user-role: rider" \\
  -H "x-username: john_doe" \\
  -d '{
    "stationId": "STATION_001",
    "bikeId": "BIKE_001", 
    "userId": "rider123"
  }'
`);

console.log('\n2. Operator adding a station:');
console.log(`
curl -X POST http://localhost:5000/api/stations \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: op789" \\
  -H "x-user-role: operator" \\
  -H "x-username: admin_user" \\
  -d '{
    "stationId": "NEW_STATION_001",
    "capacity": 20,
    "location": "Downtown Plaza"
  }'
`);

console.log('\n3. Operator performing manual bike move:');
console.log(`
curl -X POST http://localhost:5000/api/manual-move \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: op789" \\
  -H "x-user-role: operator" \\
  -H "x-username: admin_user" \\
  -d '{
    "bikeId": "BIKE_001",
    "fromStationId": "STATION_001",
    "toStationId": "STATION_002", 
    "operatorId": "op789"
  }'
`);

console.log('\n❌ Error Responses:');
console.log('\nMissing authentication:');
console.log('  Status: 401 Unauthorized');
console.log('  Message: "Authentication required. Please provide user credentials."');

console.log('\nInsufficient permissions:');
console.log('  Status: 403 Forbidden'); 
console.log('  Message: "Access denied. Required role(s): operator. Your role: rider"');

console.log('\nOwnership validation failure:');
console.log('  Status: 403 Forbidden');
console.log('  Message: "Riders can only rent bikes for themselves"');

console.log('\n🚀 Testing the Permission System:');
console.log('   1. Start server: node server-clean.js');
console.log('   2. Run permission tests: node test-permissions.js');
console.log('   3. Try the curl examples above');
console.log('   4. Check server logs for authentication attempts');

console.log('\n💡 Integration Tips:');
console.log('   - Frontend should store user role after login');
console.log('   - Include role in all API requests to protected endpoints');
console.log('   - Handle 401/403 responses by redirecting to login');
console.log('   - Operators get access to admin features in UI');
console.log('   - Riders only see bike rental/return features');

console.log('\n🔒 Security Notes:');
console.log('   - This is a demo system using headers for simplicity');
console.log('   - Production systems should use JWT tokens or sessions');
console.log('   - Validate tokens server-side, never trust client claims');
console.log('   - Implement proper password hashing and user management');
console.log('   - Add rate limiting and other security measures');