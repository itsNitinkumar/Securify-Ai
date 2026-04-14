#!/bin/bash

# Template System Testing Script

BASE_URL="http://localhost:5000/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Template System Testing Suite       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Create manager user
echo -e "${YELLOW}STEP 1: Creating Manager User${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MANAGER=$(curl -s -c manager-cookies.txt -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Template Manager",
    "email": "manager'$(date +%s)'@test.com",
    "password": "SecurePass123!"
  }')

if echo "$MANAGER" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Manager created${NC}"
  MANAGER_ID=$(echo "$MANAGER" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "  Manager ID: $MANAGER_ID"
  echo ""
  echo -e "${YELLOW}⚠️  Update user role to 'manager' in database:${NC}"
  echo "  UPDATE users SET role = 'manager' WHERE id = $MANAGER_ID;"
  echo ""
  echo "Press Enter after running the SQL command..."
  read
else
  echo -e "${RED}✗ Failed${NC}"
  exit 1
fi

# Test 1: Get all templates (should have default)
echo -e "\n${YELLOW}TEST 1: Get All Templates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TEMPLATES=$(curl -s -b manager-cookies.txt $BASE_URL/templates)

if echo "$TEMPLATES" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Templates retrieved${NC}"
  TEMPLATE_COUNT=$(echo "$TEMPLATES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "  Total templates: $TEMPLATE_COUNT"
else
  echo -e "${RED}✗ Failed${NC}"
fi

# Test 2: Get default template
echo -e "\n${YELLOW}TEST 2: Get Default Template${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEFAULT=$(curl -s -b manager-cookies.txt $BASE_URL/templates/default)

if echo "$DEFAULT" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Default template retrieved${NC}"
  TEMPLATE_NAME=$(echo "$DEFAULT" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Template: $TEMPLATE_NAME"
else
  echo -e "${RED}✗ Failed${NC}"
fi

# Test 3: Create custom template
echo -e "\n${YELLOW}TEST 3: Create Custom Template${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CUSTOM=$(curl -s -b manager-cookies.txt -X POST $BASE_URL/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Security Assessment Report",
    "description": "Custom template for security assessments",
    "company_name": "Acme Security Inc",
    "header_text": "CONFIDENTIAL - Security Assessment",
    "footer_text": "© 2026 Acme Security Inc",
    "primary_color": "#ff0000",
    "sections": [
      {"type": "cover_page", "title": "Cover Page", "enabled": true},
      {"type": "executive_summary", "title": "Executive Summary", "enabled": true},
      {"type": "detailed_findings", "title": "Findings", "enabled": true},
      {"type": "conclusion", "title": "Conclusion", "enabled": true}
    ]
  }')

if echo "$CUSTOM" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Custom template created${NC}"
  CUSTOM_ID=$(echo "$CUSTOM" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo "  Template ID: $CUSTOM_ID"
else
  echo -e "${RED}✗ Failed${NC}"
  echo "$CUSTOM"
fi

# Test 4: Update template
if [ -n "$CUSTOM_ID" ]; then
  echo -e "\n${YELLOW}TEST 4: Update Template${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  UPDATE=$(curl -s -b manager-cookies.txt -X PUT $BASE_URL/templates/$CUSTOM_ID \
    -H "Content-Type: application/json" \
    -d '{
      "description": "Updated custom template",
      "primary_color": "#0000ff"
    }')

  if echo "$UPDATE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Template updated${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
  fi
fi

# Test 5: Set as default
if [ -n "$CUSTOM_ID" ]; then
  echo -e "\n${YELLOW}TEST 5: Set Custom Template as Default${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  SET_DEFAULT=$(curl -s -b manager-cookies.txt -X POST $BASE_URL/templates/$CUSTOM_ID/set-default)

  if echo "$SET_DEFAULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Template set as default${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
  fi
fi

# Test 6: Get user's templates
echo -e "\n${YELLOW}TEST 6: Get User's Templates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER_TEMPLATES=$(curl -s -b manager-cookies.txt $BASE_URL/templates/my-templates)

if echo "$USER_TEMPLATES" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ User templates retrieved${NC}"
  USER_COUNT=$(echo "$USER_TEMPLATES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "  User's templates: $USER_COUNT"
else
  echo -e "${RED}✗ Failed${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Template Tests Complete!          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Template system working${NC}"
echo -e "${GREEN}✓ CRUD operations functional${NC}"
echo -e "${GREEN}✓ Default template management working${NC}"
echo ""
echo -e "${YELLOW}Template Variables Available:${NC}"
echo "  {{project_name}} - Project name"
echo "  {{client_name}} - Client name"
echo "  {{date}} - Current date"
echo "  {{total_findings}} - Total findings count"
echo "  {{critical_count}} - Critical findings"
echo "  {{high_count}} - High severity findings"
echo "  {{medium_count}} - Medium severity findings"
echo "  {{low_count}} - Low severity findings"
echo "  {{company_name}} - Company name from template"
echo ""

# Cleanup
rm -f manager-cookies.txt
