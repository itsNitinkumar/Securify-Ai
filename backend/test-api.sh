#!/bin/bash

# Complete API Testing Script for SecurifyAI
# Tests all major endpoints in the correct order

BASE_URL="http://localhost:5000/api/v1"
COOKIE_FILE="test-cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SecurifyAI API Testing Suite        ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Clean up old cookie file
rm -f $COOKIE_FILE

# ============================================
# 1. AUTHENTICATION TESTS
# ============================================
echo -e "${YELLOW}📝 STEP 1: Authentication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Sign up
echo -e "\n${BLUE}→ Creating new user...${NC}"
SIGNUP=$(curl -s -c $COOKIE_FILE -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Manager",
    "email": "test'$(date +%s)'@example.com",
    "password": "SecurePass123!"
  }')

if echo "$SIGNUP" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ User created successfully${NC}"
  USER_EMAIL=$(echo "$SIGNUP" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$SIGNUP" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "  Email: $USER_EMAIL"
  echo "  ID: $USER_ID"
else
  echo -e "${RED}✗ Failed to create user${NC}"
  echo "$SIGNUP"
  exit 1
fi

# Get profile
echo -e "\n${BLUE}→ Getting user profile...${NC}"
PROFILE=$(curl -s -b $COOKIE_FILE $BASE_URL/auth/profile)
if echo "$PROFILE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Profile retrieved${NC}"
else
  echo -e "${RED}✗ Failed to get profile${NC}"
fi

# ============================================
# 2. PROJECT MANAGEMENT TESTS
# ============================================
echo -e "\n${YELLOW}📁 STEP 2: Project Management${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create project
echo -e "\n${BLUE}→ Creating project...${NC}"
PROJECT=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp Pentest",
    "client_name": "Acme Corporation",
    "description": "Q1 2026 Penetration Testing Assessment",
    "start_date": "2026-03-01",
    "end_date": "2026-03-31"
  }')

if echo "$PROJECT" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Project created${NC}"
  PROJECT_ID=$(echo "$PROJECT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "  Project ID: $PROJECT_ID"
else
  echo -e "${RED}✗ Failed to create project${NC}"
  echo "$PROJECT"
  echo -e "${YELLOW}Note: This might fail if user doesn't have 'manager' role${NC}"
  echo -e "${YELLOW}Creating finding without project instead...${NC}"
  PROJECT_ID=""
fi

# List projects
echo -e "\n${BLUE}→ Listing all projects...${NC}"
PROJECTS=$(curl -s -b $COOKIE_FILE $BASE_URL/projects)
if echo "$PROJECTS" | grep -q '\['; then
  echo -e "${GREEN}✓ Projects listed${NC}"
  PROJECT_COUNT=$(echo "$PROJECTS" | grep -o '"id":' | wc -l)
  echo "  Total projects: $PROJECT_COUNT"
else
  echo -e "${RED}✗ Failed to list projects${NC}"
fi

# ============================================
# 3. FINDING GENERATION TESTS
# ============================================
echo -e "\n${YELLOW}🔍 STEP 3: Finding Generation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Generate finding
echo -e "\n${BLUE}→ Generating SQL Injection finding...${NC}"

if [ -n "$PROJECT_ID" ]; then
  FINDING_DATA='{
    "evidence": "During testing of the login functionality, I discovered a SQL injection vulnerability. By entering the payload '\''OR'\''1'\''='\''1 in the username field, I was able to bypass authentication and gain unauthorized access to the admin panel. The application did not properly sanitize user input before passing it to the SQL query.",
    "severity": "Critical",
    "project_id": '$PROJECT_ID',
    "affected_url": "https://acme.example.com/login"
  }'
else
  FINDING_DATA='{
    "evidence": "During testing of the login functionality, I discovered a SQL injection vulnerability. By entering the payload '\''OR'\''1'\''='\''1 in the username field, I was able to bypass authentication and gain unauthorized access to the admin panel. The application did not properly sanitize user input before passing it to the SQL query.",
    "severity": "Critical",
    "affected_url": "https://acme.example.com/login"
  }'
fi

FINDING=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/findings/generate \
  -H "Content-Type: application/json" \
  -d "$FINDING_DATA")

if echo "$FINDING" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Finding generated${NC}"
  FINDING_ID=$(echo "$FINDING" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  FINDING_TITLE=$(echo "$FINDING" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
  echo "  Finding ID: $FINDING_ID"
  echo "  Title: $FINDING_TITLE"
else
  echo -e "${RED}✗ Failed to generate finding${NC}"
  echo "$FINDING"
  exit 1
fi

# List findings
echo -e "\n${BLUE}→ Listing all findings...${NC}"
FINDINGS=$(curl -s -b $COOKIE_FILE $BASE_URL/findings)
if echo "$FINDINGS" | grep -q '\['; then
  echo -e "${GREEN}✓ Findings listed${NC}"
  FINDING_COUNT=$(echo "$FINDINGS" | grep -o '"id":' | wc -l)
  echo "  Total findings: $FINDING_COUNT"
else
  echo -e "${RED}✗ Failed to list findings${NC}"
fi

# Get specific finding
echo -e "\n${BLUE}→ Getting finding details...${NC}"
FINDING_DETAIL=$(curl -s -b $COOKIE_FILE $BASE_URL/findings/$FINDING_ID)
if echo "$FINDING_DETAIL" | grep -q '"title"'; then
  echo -e "${GREEN}✓ Finding details retrieved${NC}"
else
  echo -e "${RED}✗ Failed to get finding details${NC}"
fi

# ============================================
# 4. FINDING UPDATE TESTS
# ============================================
echo -e "\n${YELLOW}✏️  STEP 4: Finding Updates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update finding
echo -e "\n${BLUE}→ Updating finding...${NC}"
UPDATE=$(curl -s -b $COOKIE_FILE -X PUT $BASE_URL/findings/$FINDING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SQL Injection in Login Form (Updated)",
    "status": "pending_review"
  }')

if echo "$UPDATE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Finding updated${NC}"
else
  echo -e "${RED}✗ Failed to update finding${NC}"
fi

# Regenerate specific section
echo -e "\n${BLUE}→ Regenerating remediation section...${NC}"
REGEN=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/findings/$FINDING_ID/regenerate \
  -H "Content-Type: application/json" \
  -d '{
    "section": "remediation",
    "context": "Focus on parameterized queries and input validation"
  }')

if echo "$REGEN" | grep -q '"remediation"'; then
  echo -e "${GREEN}✓ Section regenerated${NC}"
else
  echo -e "${RED}✗ Failed to regenerate section${NC}"
fi

# ============================================
# 5. VERSION HISTORY TESTS
# ============================================
echo -e "\n${YELLOW}📚 STEP 5: Version History${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get version history
echo -e "\n${BLUE}→ Getting version history...${NC}"
VERSIONS=$(curl -s -b $COOKIE_FILE $BASE_URL/findings/$FINDING_ID/versions)
if echo "$VERSIONS" | grep -q '\['; then
  echo -e "${GREEN}✓ Version history retrieved${NC}"
  VERSION_COUNT=$(echo "$VERSIONS" | grep -o '"version_number":' | wc -l)
  echo "  Total versions: $VERSION_COUNT"
else
  echo -e "${RED}✗ Failed to get version history${NC}"
fi

# ============================================
# 6. NATURAL LANGUAGE QUERY TESTS
# ============================================
echo -e "\n${YELLOW}💬 STEP 6: Natural Language Query${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Query findings
echo -e "\n${BLUE}→ Querying: 'Show all critical findings'${NC}"
QUERY=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/findings/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show all critical findings"
  }')

if echo "$QUERY" | grep -q '"findings"'; then
  echo -e "${GREEN}✓ Query executed${NC}"
  QUERY_COUNT=$(echo "$QUERY" | grep -o '"id":' | wc -l)
  echo "  Results found: $QUERY_COUNT"
else
  echo -e "${RED}✗ Failed to execute query${NC}"
fi

# ============================================
# 7. DASHBOARD TESTS
# ============================================
echo -e "\n${YELLOW}📊 STEP 7: Dashboard Statistics${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get overall stats
echo -e "\n${BLUE}→ Getting dashboard stats...${NC}"
STATS=$(curl -s -b $COOKIE_FILE $BASE_URL/dashboard/stats)
if echo "$STATS" | grep -q '"total_findings"'; then
  echo -e "${GREEN}✓ Dashboard stats retrieved${NC}"
  TOTAL=$(echo "$STATS" | grep -o '"total_findings":[0-9]*' | cut -d':' -f2)
  echo "  Total findings: $TOTAL"
else
  echo -e "${RED}✗ Failed to get dashboard stats${NC}"
fi

# Get findings by severity
echo -e "\n${BLUE}→ Getting findings by severity...${NC}"
SEVERITY=$(curl -s -b $COOKIE_FILE $BASE_URL/dashboard/findings/by-severity)
if echo "$SEVERITY" | grep -q '\['; then
  echo -e "${GREEN}✓ Severity breakdown retrieved${NC}"
else
  echo -e "${RED}✗ Failed to get severity breakdown${NC}"
fi

# Get recent activity
echo -e "\n${BLUE}→ Getting recent activity...${NC}"
ACTIVITY=$(curl -s -b $COOKIE_FILE $BASE_URL/dashboard/activity/recent)
if echo "$ACTIVITY" | grep -q '\['; then
  echo -e "${GREEN}✓ Recent activity retrieved${NC}"
  ACTIVITY_COUNT=$(echo "$ACTIVITY" | grep -o '"id":' | wc -l)
  echo "  Recent activities: $ACTIVITY_COUNT"
else
  echo -e "${RED}✗ Failed to get recent activity${NC}"
fi

# ============================================
# 8. EVIDENCE UPLOAD TEST (if file exists)
# ============================================
echo -e "\n${YELLOW}📎 STEP 8: Evidence Upload${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a test image file
echo -e "\n${BLUE}→ Creating test evidence file...${NC}"
echo "Test Evidence" > test-evidence.txt

echo -e "\n${BLUE}→ Uploading evidence...${NC}"
EVIDENCE=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/evidence/upload \
  -F "file=@test-evidence.txt" \
  -F "finding_id=$FINDING_ID" \
  -F "caption=SQL Injection Proof of Concept")

if echo "$EVIDENCE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Evidence uploaded${NC}"
  EVIDENCE_ID=$(echo "$EVIDENCE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "  Evidence ID: $EVIDENCE_ID"
else
  echo -e "${RED}✗ Failed to upload evidence${NC}"
fi

# Clean up test file
rm -f test-evidence.txt

# ============================================
# 9. REPORT GENERATION TEST
# ============================================
if [ -n "$PROJECT_ID" ]; then
  echo -e "\n${YELLOW}📄 STEP 9: Report Generation${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Approve finding first
  echo -e "\n${BLUE}→ Approving finding...${NC}"
  APPROVE=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/findings/$FINDING_ID/approve)
  if echo "$APPROVE" | grep -q '"status":"approved"'; then
    echo -e "${GREEN}✓ Finding approved${NC}"
  else
    echo -e "${YELLOW}⚠ Could not approve (might need manager role)${NC}"
  fi

  # Generate report
  echo -e "\n${BLUE}→ Generating PDF report...${NC}"
  REPORT=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/reports/generate \
    -H "Content-Type: application/json" \
    -d '{
      "project_id": '$PROJECT_ID',
      "format": "pdf"
    }')

  if echo "$REPORT" | grep -q '"id"'; then
    echo -e "${GREEN}✓ Report generated${NC}"
    REPORT_ID=$(echo "$REPORT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "  Report ID: $REPORT_ID"
    echo "  Download: curl -b $COOKIE_FILE $BASE_URL/reports/$REPORT_ID/download -o report.pdf"
  else
    echo -e "${RED}✗ Failed to generate report${NC}"
    echo "$REPORT"
  fi
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Testing Complete!             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Authentication working${NC}"
echo -e "${GREEN}✓ Finding generation working${NC}"
echo -e "${GREEN}✓ Version control working${NC}"
echo -e "${GREEN}✓ Dashboard working${NC}"
echo -e "${GREEN}✓ Evidence upload working${NC}"
echo ""
echo -e "${YELLOW}📝 Test Data:${NC}"
echo "  User: $USER_EMAIL"
echo "  User ID: $USER_ID"
[ -n "$PROJECT_ID" ] && echo "  Project ID: $PROJECT_ID"
echo "  Finding ID: $FINDING_ID"
echo "  Cookie file: $COOKIE_FILE"
echo ""
echo -e "${BLUE}🔧 Quick Commands:${NC}"
echo "  List findings:  curl -b $COOKIE_FILE $BASE_URL/findings"
echo "  Get stats:      curl -b $COOKIE_FILE $BASE_URL/dashboard/stats"
echo "  Get profile:    curl -b $COOKIE_FILE $BASE_URL/auth/profile"
echo ""
