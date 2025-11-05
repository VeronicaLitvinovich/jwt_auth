#!/bin/bash

BASE_URL="http://localhost:8080"

echo "=== Testing Hybrid Authentication ==="

echo -e "\n1. Testing user registration..."
curl -X POST -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456"
}' "$BASE_URL/api/auth/signup"

echo -e "\n\n2. Testing admin registration..."
curl -X POST -H "Content-Type: application/json" -d '{
  "username": "testadmin",
  "email": "admin@example.com",
  "password": "123456",
  "roles": ["admin"]
}' "$BASE_URL/api/auth/signup"

echo -e "\n\n3. Testing user login (should get session cookie + JWT tokens)..."
RESPONSE=$(curl -c cookies.txt -X POST -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "password": "123456"
}' "$BASE_URL/api/auth/signin")

echo "$RESPONSE"

ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

echo -e "\nAccess Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

echo -e "\n4. Testing session check..."
curl -b cookies.txt "$BASE_URL/api/auth/session"

echo -e "\n\n5. Testing public route..."
curl "$BASE_URL/api/test/all"

echo -e "\n\n6. Testing user route with SESSION (cookies)..."
curl -b cookies.txt "$BASE_URL/api/test/user"

echo -e "\n\n7. Testing user route with JWT token..."
curl -H "x-access-token: $ACCESS_TOKEN" "$BASE_URL/api/test/user-token"

echo -e "\n\n8. Testing user route with HYBRID (should work with both)..."
curl -b cookies.txt -H "x-access-token: $ACCESS_TOKEN" "$BASE_URL/api/test/user"

echo -e "\n\n9. Testing token refresh..."
REFRESH_RESPONSE=$(curl -X POST -H "Content-Type: application/json" -d "{
  \"refreshToken\": \"$REFRESH_TOKEN\"
}" "$BASE_URL/api/auth/refresh")

echo "$REFRESH_RESPONSE"

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
NEW_REFRESH_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

echo -e "\nNew Access Token: $NEW_ACCESS_TOKEN"

echo -e "\n\n10. Testing with new access token..."
curl -H "x-access-token: $NEW_ACCESS_TOKEN" "$BASE_URL/api/test/user-token"

echo -e "\n\n11. Testing admin login..."
ADMIN_RESPONSE=$(curl -c admin_cookies.txt -X POST -H "Content-Type: application/json" -d '{
  "username": "testadmin",
  "password": "123456"
}' "$BASE_URL/api/auth/signin")

echo "$ADMIN_RESPONSE"

ADMIN_ACCESS_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo -e "\n\n12. Testing admin route with session..."
curl -b admin_cookies.txt "$BASE_URL/api/test/admin"

echo -e "\n\n13. Testing admin route with JWT..."
curl -H "x-access-token: $ADMIN_ACCESS_TOKEN" "$BASE_URL/api/test/admin-token"

echo -e "\n\n14. Testing logout with session..."
curl -b cookies.txt -X POST "$BASE_URL/api/auth/logout"

echo -e "\n\n15. Testing logout with JWT..."
curl -H "x-access-token: $NEW_ACCESS_TOKEN" -X POST "$BASE_URL/api/auth/logout"

echo -e "\n\n16. Testing access after logout (should fail)..."
curl -b cookies.txt "$BASE_URL/api/test/user"

echo -e "\n\n=== Testing completed ==="