#!/bin/bash

# Setup test data for SecurifyAI
# This script creates a test user, project, and finding

BASE_URL="http://localhost:5000/api/v1"
COOKIE_FILE="test-cookies.txt"

echo "🧪 Setting up test data for SecurifyAI..."
echo ""

# Step 1: Sign up a test user
echo "1️⃣  Creating test user..."
SIGNUP_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Manager",
    "email": "manager@test.com",
    "password": "SecurePass123!"
  }')

if echo "$SIGNUP_RESPONSE" | grep -q "token"; then
  echo "✅ User created successfully"
  USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "   User ID: $USER_ID"
else
  echo "⚠️  User might already exist, trying to sign in..."
  
  # Try to sign in instead
  SIGNIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST $BASE_URL/auth/signin \
    -H "Content-Type: application/json" \
    -d '{
      "email": "manager@test.com",
      "password": "SecurePass123!"
    }')
  
  if echo "$SIGNIN_RESPONSE" | grep -q "token"; then
    echo "✅ Signed in successfully"
    USER_ID=$(echo "$SIGNIN_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "   User ID: $USER_ID"
  else
    echo "❌ Failed to create or sign in user"
    echo "$SIGNIN_RESPONSE"
    exit 1
  fi
fi

echo ""

# Step 2: Update user role to manager (direct DB update needed)
echo "2️⃣  Updating user role to 'manager'..."
echo "   Run this SQL command in your database:"
echo "   UPDATE users SET role = 'manager' WHERE email = 'manager@test.com';"
echo ""
echo "   Press Enter after running the SQL command..."
read

# Step 3: Create a test project
echo "3️⃣  Creating test project..."
PROJECT_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "client_name": "Acme Corp",
    "description": "Test penetration testing project",
    "start_date": "2026-03-01",
    "end_date": "2026-03-31"
  }')

if echo "$PROJECT_RESPONSE" | grep -q '"id"'; then
  echo "✅ Project created successfully"
  PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "   Project ID: $PROJECT_ID"
else
  echo "❌ Failed to create project"
  echo "$PROJECT_RESPONSE"
  exit 1
fi

echo ""

# Step 4: Create test finding JSON
echo "4️⃣  Creating test finding data file..."
cat > test-finding.json <<EOF
{
  "evidence": "During testing, I discovered a SQL injection vulnerability in the login form. By entering ' OR '1'='1 in the username field, I was able to bypass authentication and gain unauthorized access to the admin panel.",
  "severity": "Critical",
  "project_id": $PROJECT_ID,
  "affected_url": "https://example.com/login"
}
EOF

echo "✅ Created test-finding.json"
echo ""

# Step 5: Test finding generation
echo "5️⃣  Testing finding generation..."
FINDING_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/findings/generate \
  -H "Content-Type: application/json" \
  -d @test-finding.json)

if echo "$FINDING_RESPONSE" | grep -q '"id"'; then
  echo "✅ Finding generated successfully"
  FINDING_ID=$(echo "$FINDING_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "   Finding ID: $FINDING_ID"
  echo ""
  echo "📋 Finding Title: $(echo "$FINDING_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ Failed to generate finding"
  echo "$FINDING_RESPONSE"
  exit 1
fi

echo ""
echo "✅ Test data setup complete!"
echo ""
echo "📝 Summary:"
echo "   - User: manager@test.com (password: SecurePass123!)"
echo "   - Project ID: $PROJECT_ID"
echo "   - Finding ID: $FINDING_ID"
echo "   - Cookie file: $COOKIE_FILE"
echo ""
echo "🧪 You can now test other endpoints using:"
echo "   curl -b $COOKIE_FILE http://localhost:5000/api/v1/findings"
echo "   curl -b $COOKIE_FILE http://localhost:5000/api/v1/projects"
echo "   curl -b $COOKIE_FILE http://localhost:5000/api/v1/dashboard/stats"
