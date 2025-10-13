#!/bin/bash

# Test Business Rules: Rental and Reservation Constraints
echo "🧪 Testing Business Rules: Rent/Reserve Constraints"
echo "============================================================"

SERVER="http://localhost:5000"
USER_ID=""

# Test user data
USERNAME="testrider_$(date +%s)"
PASSWORD="testpass123"

echo ""
echo "📝 Step 1: Register test user..."
REGISTER_RESPONSE=$(curl -s -X POST $SERVER/api/register \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\", \"firstName\": \"Test\", \"lastName\": \"Rider\", \"email\": \"test@example.com\"}")

echo "Registration response: $REGISTER_RESPONSE"

# Extract user ID from response (simple grep approach)
if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User registered successfully"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo "User ID: $USER_ID"
else
    echo "❌ Registration failed"
    exit 1
fi

echo ""
echo "🔐 Step 2: Login test user..."
LOGIN_RESPONSE=$(curl -s -X POST $SERVER/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Login successful"
else
    echo "❌ Login failed"
    exit 1
fi

# Set auth headers
AUTH_HEADERS="-H 'Content-Type: application/json' -H 'X-User-ID: $USER_ID' -H 'X-User-Role: rider' -H 'X-Username: $USERNAME'"

echo ""
echo "📋 Step 3: Test making a reservation..."
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
    echo "🚫 Step 4: Test second reservation (should fail)..."
    SECOND_RESERVE_RESPONSE=$(curl -s -X POST $SERVER/api/reserve \
      -H "Content-Type: application/json" \
      -H "X-User-ID: $USER_ID" \
      -H "X-User-Role: rider" \
      -H "X-Username: $USERNAME" \
      -d '{"stationId": "STN001", "bikeId": "BIKE002"}')
    
    echo "Second reserve response: $SECOND_RESERVE_RESPONSE"
    
    if echo "$SECOND_RESERVE_RESPONSE" | grep -q "USER_HAS_ACTIVE_RESERVATION\|already have an active reservation"; then
        echo "✅ Second reservation correctly blocked"
    else
        echo "❌ Second reservation should have been blocked"
    fi
    
    echo ""
    echo "🚫 Step 5: Test rent different bike (should fail)..."
    RENT_DIFFERENT_RESPONSE=$(curl -s -X POST $SERVER/api/rent \
      -H "Content-Type: application/json" \
      -H "X-User-ID: $USER_ID" \
      -H "X-User-Role: rider" \
      -H "X-Username: $USERNAME" \
      -d "{\"stationId\": \"STN001\", \"bikeId\": \"BIKE002\", \"userId\": \"$USER_ID\"}")
    
    echo "Rent different bike response: $RENT_DIFFERENT_RESPONSE"
    
    if echo "$RENT_DIFFERENT_RESPONSE" | grep -q "USER_HAS_DIFFERENT_RESERVATION\|different bike"; then
        echo "✅ Renting different bike correctly blocked"
    else
        echo "❌ Renting different bike should have been blocked"
    fi
    
    echo ""
    echo "✅ Step 6: Test rent reserved bike (should succeed)..."
    RENT_RESERVED_RESPONSE=$(curl -s -X POST $SERVER/api/rent \
      -H "Content-Type: application/json" \
      -H "X-User-ID: $USER_ID" \
      -H "X-User-Role: rider" \
      -H "X-Username: $USERNAME" \
      -d "{\"stationId\": \"STN001\", \"bikeId\": \"BIKE001\", \"userId\": \"$USER_ID\"}")
    
    echo "Rent reserved bike response: $RENT_RESERVED_RESPONSE"
    
    if echo "$RENT_RESERVED_RESPONSE" | grep -q "success.*true"; then
        echo "✅ Renting reserved bike successful"
        
        echo ""
        echo "🚫 Step 7: Test reservation with active rental (should fail)..."
        RESERVE_WITH_RENTAL_RESPONSE=$(curl -s -X POST $SERVER/api/reserve \
          -H "Content-Type: application/json" \
          -H "X-User-ID: $USER_ID" \
          -H "X-User-Role: rider" \
          -H "X-Username: $USERNAME" \
          -d '{"stationId": "STN001", "bikeId": "BIKE002"}')
        
        echo "Reserve with rental response: $RESERVE_WITH_RENTAL_RESPONSE"
        
        if echo "$RESERVE_WITH_RENTAL_RESPONSE" | grep -q "USER_HAS_ACTIVE_RENTAL\|active bike rental"; then
            echo "✅ Reservation with active rental correctly blocked"
        else
            echo "❌ Reservation with active rental should have been blocked"
        fi
        
        echo ""
        echo "🔄 Step 8: Return bike to clean up..."
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
        echo "❌ Renting reserved bike failed"
    fi
    
else
    echo "❌ Initial reservation failed"
fi

echo ""
echo "🎉 Business rules test completed!"