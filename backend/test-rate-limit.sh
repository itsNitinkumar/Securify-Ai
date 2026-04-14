#!/bin/bash

# Rate Limiting Testing Script

BASE_URL="http://localhost:5000/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Rate Limiting Testing Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Auth Rate Limiting (5 requests per 15 minutes)
echo -e "${YELLOW}TEST 1: Authentication Rate Limiting${NC}"
echo -e "${YELLOW}Limit: 5 requests per 15 minutes${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUCCESS_COUNT=0
BLOCKED_COUNT=0

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" == "429" ]; then
    echo -e "  Request $i: ${RED}✗ Blocked (429 Too Many Requests)${NC}"
    ((BLOCKED_COUNT++))
  else
    echo -e "  Request $i: ${GREEN}✓ Allowed ($HTTP_CODE)${NC}"
    ((SUCCESS_COUNT++))
  fi
  
  sleep 0.5
done

echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  Allowed: $SUCCESS_COUNT"
echo "  Blocked: $BLOCKED_COUNT"

if [ $BLOCKED_COUNT -gt 0 ]; then
  echo -e "${GREEN}✓ Auth rate limiting is working!${NC}"
else
  echo -e "${RED}✗ Auth rate limiting may not be working${NC}"
fi

# Test 2: Global Rate Limiting
echo ""
echo -e "\n${YELLOW}TEST 2: Global Rate Limiting${NC}"
echo -e "${YELLOW}Limit: 200 requests per 15 minutes${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Making 10 rapid requests to test global limiter..."

GLOBAL_SUCCESS=0
GLOBAL_BLOCKED=0

for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
  
  if [ "$HTTP_CODE" == "429" ]; then
    ((GLOBAL_BLOCKED++))
  else
    ((GLOBAL_SUCCESS++))
  fi
done

echo "  Allowed: $GLOBAL_SUCCESS"
echo "  Blocked: $GLOBAL_BLOCKED"

if [ $GLOBAL_SUCCESS -eq 10 ]; then
  echo -e "${GREEN}✓ Global rate limiter allows normal traffic${NC}"
else
  echo -e "${YELLOW}⚠ Some requests were blocked${NC}"
fi

# Test 3: Check Rate Limit Headers
echo ""
echo -e "\n${YELLOW}TEST 3: Rate Limit Headers${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEADERS=$(curl -s -I $BASE_URL/health)

if echo "$HEADERS" | grep -q "RateLimit-Limit"; then
  echo -e "${GREEN}✓ Rate limit headers present${NC}"
  echo "$HEADERS" | grep "RateLimit"
else
  echo -e "${YELLOW}⚠ Rate limit headers not found${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Rate Limiting Tests Complete!    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Rate Limiting Configuration:${NC}"
echo "  • Auth endpoints: 5 requests / 15 min"
echo "  • AI generation: 50 requests / hour"
echo "  • File uploads: 50 requests / hour"
echo "  • Report generation: 20 requests / hour"
echo "  • General API: 100 requests / 15 min"
echo "  • Global limit: 200 requests / 15 min"
echo ""
