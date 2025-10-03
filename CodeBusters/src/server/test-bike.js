// Test our Bike class
const Bike = require('./src/bms/Bike');

console.log('🚲 Testing Bike Reserve Method');
console.log('==============================\n');

// Create a new bike
const bike1 = new Bike('BIKE001', 'standard');
console.log('1. Created bike:', bike1.getInfo());

// Test reservation
console.log('\n2. Attempting to reserve bike...');
const result1 = bike1.reserve('user123', 15);
console.log('Result:', result1);

// Check bike state after reservation
console.log('\n3. Bike state after reservation:');
console.log(bike1.getInfo());

// Try to reserve again (should fail)
console.log('\n4. Attempting to reserve already reserved bike...');
const result2 = bike1.reserve('user456', 20);
console.log('Result:', result2);