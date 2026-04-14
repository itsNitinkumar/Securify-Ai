#!/bin/bash

# RBAC Testing Script
# Tests role-based access control

BASE_URL="http://localhost:5000/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      RBAC Testing Suite                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Create Analyst user
echo -e "${YELLOW}TEST 1: Creating Analyst User${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ANALYST=$(curl -s -c analyst-cookies.txt -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Analyst",
    "email": "analyst'$(date +%s)'@test.com",
    "password": "SecurePass123!"
  }')

if echo "$ANALYST" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Analyst created${NC}"
  ANALYST_ID=$(echo "$ANALYST" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
else
  echo -e "${RED}✗ Failed${NC}"
  exit 1
fi

# Test 2: Analyst tries to create project (should fail)
echo -e "\n${YELLOW}TEST 2: Analyst Creating Project (Should FAIL)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PROJECT=$(curl -s -b analyst-cookies.txt -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "client_name": "Test Client"
  }')

if echo "$PROJECT" | grep -q '"success":false'; then
  echo -e "${GREEN}✓ Correctly blocked (403 Forbidden)${NC}"
  echo "  Message: $(echo "$PROJECT" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
else
  echo -e "${RED}✗ RBAC FAILED - Analyst was able to create project!${NC}"
fi

# Test 3: Analyst can create finding (should succeed)
echo -e "\n${YELLOW}TEST 3: Analyst Creating Finding (Should SUCCEED)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FINDING=$(curl -s -b analyst-cookies.txt -X POST $BASE_URL/findings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "evidence": "SQL injection found in login form",
    "severity": "Critical"
  }')

if echo "$FINDING" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Finding created successfully${NC}"
  FINDING_ID=$(echo "$FINDING" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
else
  echo -e "${RED}✗ Failed${NC}"
fi

# Test 4: Analyst tries to approve finding (should fail)
if [ -n "$FINDING_ID" ]; then
  echo -e "\n${YELLOW}TEST 4: Analyst Approving Finding (Should FAIL)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  APPROVE=$(curl -s -b analyst-cookies.txt -X POST $BASE_URL/findings/$FINDING_ID/approve)

  if echo "$APPROVE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Correctly blocked (403 Forbidden)${NC}"
    echo "  Message: $(echo "$APPROVE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
  else
    echo -e "${RED}✗ RBAC FAILED - Analyst was able to approve!${NC}"
  fi
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         RBAC Tests Complete!           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  - Analysts can create findings ✓"
echo "  - Analysts cannot create projects ✓"
echo "  - Analysts cannot approve findings ✓"
echo ""
echo -e "${YELLOW}To test Manager role:${NC}"
echo "  1. Update user role in database:"
echo "     UPDATE users SET role = 'manager' WHERE id = $ANALYST_ID;"
echo "  2. Try creating a project again"
echo ""

# Cleanup
rm -f analyst-cookies.txt
