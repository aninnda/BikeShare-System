#!/bin/bash

# Test the "Rent Now" functionality for reserved bikes
echo "🧪 Testing 'Rent Now' Button for Reserved Bikes"
echo "============================================================"

SERVER="http://localhost:5000"

# Test user data
USERNAME="renttest_$(date +%s)"
PASSWORD="testpass123"

echo ""
echo "📝 Step 1: Register test user..."
REGISTER_RESPONSE=$(curl -s -X POST $SERVER/api/register \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\", \"firstName\": \"Test\", \"lastName\": \"Rider\", \"email\": \"test@example.com\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User registered successfully"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo "User ID: $USER_ID"
else
    echo "❌ Registration failed: $REGISTER_RESPONSE"
    exit 1
fi

echo ""
echo "🔐 Step 2: Login test user..."
LOGIN_RESPONSE=$(curl -s -X POST $SERVER/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Login successful"
else
    echo "❌ Login failed: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "📋 Step 3: Reserve a bike..."
RESERVE_RESPONSE=$(curl -s -X POST $SERVER/api/reserve \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $USER_ID" \
  -H "X-User-Role: rider" \
  -H "X-Username: $USERNAME" \
  -d '{"stationId": "STN001", "bikeId": "BIKE001"}')

echo "Reserve response: $RESERVE_RESPONSE"

if echo "$RESERVE_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Reservation successful"
    
    echo ""
    echo "🚲 Step 4: Test 'Rent Now' - Rent the reserved bike..."
    RENT_RESPONSE=$(curl -s -X POST $SERVER/api/rent \
      -H "Content-Type: application/json" \
      -H "X-User-ID: $USER_ID" \
      -H "X-User-Role: rider" \
      -H "X-Username: $USERNAME" \
      -d "{\"stationId\": \"STN001\", \"bikeId\": \"BIKE001\", \"userId\": \"$USER_ID\"}")
    
    echo "Rent response: $RENT_RESPONSE"
    
    if echo "$RENT_RESPONSE" | grep -q "success.*true"; then
        echo "✅ 'Rent Now' button functionality works! Reserved bike successfully rented"
        
        echo ""
        echo "📊 Step 5: Check user's active rental..."
        RENTAL_STATUS_RESPONSE=$(curl -s -X GET "$SERVER/api/users/$USER_ID/rental" \
          -H "Content-Type: application/json")
        
        echo "Rental status: $RENTAL_STATUS_RESPONSE"
        
        if echo "$RENTAL_STATUS_RESPONSE" | grep -q "hasActiveRental.*true"; then
            echo "✅ Active rental confirmed in system"
        else
            echo "⚠️ Active rental not found in system"
        fi
        
        echo ""
        echo "🔄 Step 6: Return the bike to clean up..."
        RETURN_RESPONSE=$(curl -s -X POST $SERVER/api/return \
          -H "Content-Type: application/json" \
          -H "X-User-ID: $USER_ID" \
          -H "X-User-Role: rider" \
          -H "X-Username: $USERNAME" \
          -d "{\"stationId\": \"STN001\", \"bikeId\": \"BIKE001\", \"userId\": \"$USER_ID\"}")
        
        echo "Return response: $RETURN_RESPONSE"
        
        if echo "$RETURN_RESPONSE" | grep -q "success.*true"; then
            echo "✅ Bike returned successfully"
        else
            echo "⚠️ Bike return failed"
        fi
        
    else
        echo "❌ 'Rent Now' button failed! Error: $RENT_RESPONSE"
        
        # Clean up reservation
        echo ""
        echo "🧹 Cleaning up failed test - cancelling reservation..."
        CANCEL_RESPONSE=$(curl -s -X POST $SERVER/api/reserve/cancel \
          -H "Content-Type: application/json" \
          -H "X-User-ID: $USER_ID" \
          -H "X-User-Role: rider" \
          -H "X-Username: $USERNAME" \
          -d '{"stationId": "STN001", "bikeId": "BIKE001"}')
        
        echo "Cancel response: $CANCEL_RESPONSE"
    fi
    
else
    echo "❌ Initial reservation failed: $RESERVE_RESPONSE"
fi

echo ""
echo "🎉 'Rent Now' test completed!"