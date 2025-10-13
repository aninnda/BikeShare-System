#!/bin/bash

# Simple Permission System Test
echo "🔐 Testing BMS Permission System"
echo "================================="

# Start server in background
echo "Starting server..."
node server-clean.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo ""
echo "1. Testing unauthenticated request (should fail):"
echo "curl -X POST http://localhost:5000/api/rent"
curl -s -X POST http://localhost:5000/api/rent \
  -H "Content-Type: application/json" \
  -d '{"stationId": "STN001", "bikeId": "BIKE001", "userId": "rider123"}' \
  | python3 -m json.tool 2>/dev/null || echo "Request rejected (no JSON response)"

echo ""
echo "2. Testing rider with authentication:"
echo "curl with rider headers:"
curl -s -X POST http://localhost:5000/api/rent \
  -H "Content-Type: application/json" \
  -H "x-user-id: rider123" \
  -H "x-user-role: rider" \
  -H "x-username: test_rider" \
  -d '{"stationId": "STN001", "bikeId": "BIKE001", "userId": "rider123"}' \
  | python3 -m json.tool 2>/dev/null || echo "No JSON response"

echo ""
echo "3. Testing rider trying to rent for another user (should fail):"
curl -s -X POST http://localhost:5000/api/rent \
  -H "Content-Type: application/json" \
  -H "x-user-id: rider123" \
  -H "x-user-role: rider" \
  -H "x-username: test_rider" \
  -d '{"stationId": "STN001", "bikeId": "BIKE002", "userId": "rider456"}' \
  | python3 -m json.tool 2>/dev/null || echo "Request blocked"

echo ""
echo "4. Testing operator adding station:"
curl -s -X POST http://localhost:5000/api/stations \
  -H "Content-Type: application/json" \
  -H "x-user-id: op789" \
  -H "x-user-role: operator" \
  -H "x-username: test_operator" \
  -d '{"stationId": "TEST_STATION", "capacity": 10}' \
  | python3 -m json.tool 2>/dev/null || echo "No JSON response"

echo ""
echo "5. Testing rider trying to add station (should fail):"
curl -s -X POST http://localhost:5000/api/stations \
  -H "Content-Type: application/json" \
  -H "x-user-id: rider123" \
  -H "x-user-role: rider" \
  -H "x-username: test_rider" \
  -d '{"stationId": "RIDER_STATION", "capacity": 5}' \
  | python3 -m json.tool 2>/dev/null || echo "Request blocked"

echo ""
echo "Permission tests completed!"

# Kill server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null