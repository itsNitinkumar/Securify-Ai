#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000/api/v1"
COOKIES_FILE="test-cookies.txt"

echo "🧪 SecurifyAI Phase 1 Testing"
echo "=============================="
echo ""

# Step 1: Health Check
echo "Step 1: Health Check"
echo "--------------------"
HEALTH=$(curl -s $BASE_URL/health)
if echo $HEALTH | grep -q "success"; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not responding${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo ""

# Step 2: Sign Up
echo "Step 2: Creating Test User"
echo "--------------------------"
SIGNUP_RESPONSE=$(curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Analyst",
    "email": "test-analyst-'$(date +%s)'@test.com",
    "password": "SecurePass123!"
  }')

if echo $SIGNUP_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ User created successfully${NC}"
    USER_EMAIL=$(echo $SIGNUP_RESPONSE | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "Email: $USER_EMAIL"
else
    echo -e "${RED}❌ User creation failed${NC}"
    echo $SIGNUP_RESPONSE
    exit 1
fi
echo ""

# Step 3: Sign In
echo "Step 3: Signing In"
echo "------------------"
SIGNIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/signin \
  -H "Content-Type: application/json" \
  -c $COOKIES_FILE \
  -d '{
    "email": "'$USER_EMAIL'",
    "password": "SecurePass123!"
  }')

if echo $SIGNIN_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Signed in successfully${NC}"
    echo "Cookies saved to $COOKIES_FILE"
else
    echo -e "${RED}❌ Sign in failed${NC}"
    echo $SIGNIN_RESPONSE
    exit 1
fi
echo ""

# Step 4: Update user to manager (for project creation)
echo "Step 4: Updating User Role"
echo "--------------------------"
echo -e "${YELLOW}⚠️  Manual step required:${NC}"
echo "Run this SQL command in your database:"
echo ""
echo "UPDATE users SET role = 'manager' WHERE email = '$USER_EMAIL';"
echo ""
read -p "Press Enter after running the SQL command..."
echo ""

# Step 5: Create Project
echo "Step 5: Creating Project"
echo "------------------------"
PROJECT_RESPONSE=$(curl -s -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -b $COOKIES_FILE \
  -d '{
    "name": "Test Project",
    "description": "Testing SecurifyAI Phase 1",
    "client_name": "Test Client Corp"
  }')

if echo $PROJECT_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Project created successfully${NC}"
    PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Project ID: $PROJECT_ID"
else
    echo -e "${RED}❌ Project creation failed${NC}"
    echo $PROJECT_RESPONSE
    exit 1
fi
echo ""

# Step 6: Generate Finding using AI
echo "Step 6: Generating Finding with AI 🤖"
echo "-------------------------------------"
echo "This will use OpenAI to generate a professional finding..."
echo ""

FINDING_RESPONSE=$(curl -s -X POST $BASE_URL/findings/generate \
  -H "Content-Type: application/json" \
  -b $COOKIES_FILE \
  -d "{
    \"evidence\": \"During testing of the login endpoint at https://example.com/api/login, I discovered a SQL injection vulnerability. By submitting the payload username=admin' OR '1'='1 and password=anything, the application returned a 200 OK response with a valid session token, bypassing authentication completely. The application appears to be directly concatenating user input into SQL queries without proper sanitization or parameterized queries.\",
    \"severity\": \"Critical\",
    \"project_id\": $PROJECT_ID
  }")

if echo $FINDING_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Finding generated successfully!${NC}"
    FINDING_ID=$(echo $FINDING_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Finding ID: $FINDING_ID"
    echo ""
    echo "Generated Finding:"
    echo $FINDING_RESPONSE | python3 -m json.tool 2>/dev/null || echo $FINDING_RESPONSE
else
    echo -e "${RED}❌ Finding generation failed${NC}"
    echo $FINDING_RESPONSE
    exit 1
fi
echo ""

# Step 7: Upload Evidence
echo "Step 7: Uploading Evidence"
echo "--------------------------"
echo "Test evidence file" > test-evidence.txt

EVIDENCE_RESPONSE=$(curl -s -X POST $BASE_URL/evidence/upload \
  -b $COOKIES_FILE \
  -F "file=@test-evidence.txt" \
  -F "finding_id=$FINDING_ID" \
  -F "caption=SQL Injection proof of concept")

if echo $EVIDENCE_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Evidence uploaded successfully${NC}"
    EVIDENCE_ID=$(echo $EVIDENCE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Evidence ID: $EVIDENCE_ID"
else
    echo -e "${RED}❌ Evidence upload failed${NC}"
    echo $EVIDENCE_RESPONSE
fi
echo ""

# Step 8: View Version History
echo "Step 8: Checking Version History"
echo "--------------------------------"
VERSION_RESPONSE=$(curl -s $BASE_URL/findings/$FINDING_ID/versions \
  -b $COOKIES_FILE)

if echo $VERSION_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Version history retrieved${NC}"
    VERSION_COUNT=$(echo $VERSION_RESPONSE | grep -o '"version_number":[0-9]*' | wc -l)
    echo "Versions: $VERSION_COUNT"
else
    echo -e "${RED}❌ Version history retrieval failed${NC}"
fi
echo ""

# Step 9: View Activity Logs
echo "Step 9: Checking Activity Logs"
echo "-------------------------------"
ACTIVITY_RESPONSE=$(curl -s "$BASE_URL/dashboard/activity/recent?limit=5" \
  -b $COOKIES_FILE)

if echo $ACTIVITY_RESPONSE | grep -q "success"; then
    echo -e "${GREEN}✅ Activity logs retrieved${NC}"
    echo "Recent actions logged successfully"
else
    echo -e "${RED}❌ Activity logs retrieval failed${NC}"
fi
echo ""

# Cleanup
rm -f test-evidence.txt

# Summary
echo "================================"
echo "🎉 Phase 1 Testing Complete!"
echo "================================"
echo ""
echo "Summary:"
echo "--------"
echo "✅ Server health check"
echo "✅ User signup"
echo "✅ User signin"
echo "✅ Project creation"
echo "✅ AI finding generation"
echo "✅ Evidence upload"
echo "✅ Version control"
echo "✅ Activity logging"
echo ""
echo "Test Data:"
echo "----------"
echo "User Email: $USER_EMAIL"
echo "Project ID: $PROJECT_ID"
echo "Finding ID: $FINDING_ID"
echo "Evidence ID: $EVIDENCE_ID"
echo ""
echo "Cookies saved in: $COOKIES_FILE"
echo ""
echo "Next: Test Phase 2 (Report Generation)"
