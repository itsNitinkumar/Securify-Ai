# SecurifyAI - Complete Application Flow

## 1. User Onboarding & Authentication Flow

### A. New User Registration
```
1. User visits /signup
2. User enters: Email, Password, Name
3. System creates account with:
   - role: 'analyst' (default)
   - status: 'pending'
4. User sees: "Account pending approval by manager"
5. Manager gets notification
```

### B. Manager Approval
```
1. Manager logs in
2. Dashboard shows "Pending Users" badge
3. Manager clicks on pending user
4. Manager reviews user details
5. Manager assigns role:
   - Analyst (for pentesters)
   - Reviewer (for team leads)
   - Manager (for project managers)
   - Client (for customers)
6. Manager clicks "Approve"
7. User gets email: "Account approved"
8. User can now log in
```

### C. User Login
```
1. User visits /signin
2. User enters credentials
3. System checks:
   - Valid credentials?
   - Status = 'active'?
   - MFA enabled? (optional)
4. System generates JWT token
5. User redirected to dashboard
6. Dashboard shows role-specific features
```

---

## 2. Project Management Flow

### A. Create Project (Manager)
```
1. Manager clicks "New Project"
2. Manager enters:
   - Project Name
   - Client Name
   - Start Date
   - End Date
   - Assigned Analysts
   - Project Type (Web App, Network, Mobile, etc.)
3. System creates project
4. Assigned analysts get notification
```![alt text](image.png)

### B. Project Dashboard
```
Shows:
- Project details
- Assigned team members
- Findings count by severity
- Report status
- Activity timeline
```

---

## 3. Finding Creation Flow (Core Workflow)

### A. Analyst Creates Finding with AI

#### Step 1: Add Evidence & Basic Info
```
1. Analyst opens project
2. Clicks "Generate with AI" button
3. Fills in basic information:
   - Finding Title (e.g., "SQL Injection in Login Form")
   - Severity (Critical/High/Medium/Low/Informational)
   - Vulnerability Type (e.g., SQL Injection, XSS, CSRF)
   - Affected Endpoint/IP
   - Technical Evidence (paste raw evidence):
     * HTTP requests/responses
     * Error messages
     * SQL query outputs
     * Command outputs
     * Server logs
4. Clicks "Next: Upload Evidence"
5. System creates DRAFT finding with status: 'draft'
```

#### Step 2: Upload Supporting Evidence
```
1. System shows draft finding created
2. Analyst uploads supporting files:
   - Screenshots (PNG, JPG, GIF, WebP)
   - Logs (TXT, LOG, XML, JSON)
   - Scan results (Nessus, Nuclei, Burp)
   - PDFs, HTML reports
3. For each file, analyst adds caption:
   - "Login bypass using SQL injection"
   - "Database error revealing SQL query"
   - "Burp Suite request showing payload"
4. Files stored in: backend/uploads/evidence/
5. Evidence linked to draft finding in database
6. Analyst clicks "Generate with AI"
```

#### Step 3: AI Generation (with Evidence Context)
```
1. System sanitizes sensitive data:
   - Internal IPs → [INTERNAL_IP]
   - Credentials → [REDACTED]
   - API keys → [API_KEY]
   - Tokens → [TOKEN]
2. System sends to OpenAI API:
   - Text evidence
   - List of uploaded files
   - File captions
   - Severity level
3. AI analyzes ALL evidence and generates:
   - Enhanced Finding Title
   - Detailed Description
   - Affected Endpoint/IP/Host
   - Likelihood Assessment
   - Impact Analysis
   - Steps to Reproduce
   - Proof of Concept (with evidence references)
   - Remediation Recommendations
   - References (OWASP, CWE, NIST)
4. System saves as Version 1
```

#### Step 4: Review & Accept
```
1. Analyst reviews AI-generated content
2. Analyst can:
   - Accept & Save
   - Regenerate with AI
   - Cancel and start over
3. After accepting:
   - Finding updated with AI content
   - Evidence already linked
   - Status remains 'draft'
   - Ready for manual editing if needed
```

#### Step 5: Manual Editing (Optional)
```
1. Analyst can edit any section:
   - Description
   - Likelihood
   - Impact
   - Steps to Reproduce
   - Remediation
2. Analyst can:
   - Add more evidence
   - Regenerate specific sections
   - Adjust severity
3. Each edit creates new version
```

#### Step 6: Submit for Review
```
1. Analyst clicks "Submit for Review"
2. Finding status: 'pending_review'
3. Reviewer gets notification
4. Analyst can no longer edit
```

### B. Reviewer Reviews Finding

```
1. Reviewer opens finding
2. Reviewer sees:
   - All content
   - Evidence files
   - Version history
   - Activity log
3. Reviewer can:
   - Add comments
   - Request changes
   - Approve
   - Reject
```

#### If Changes Requested:
```
1. Reviewer adds comment: "Need more details on impact"
2. Clicks "Request Changes"
3. Finding status: 'changes_requested'
4. Analyst gets notification
5. Analyst edits finding
6. System saves as Version 2
7. Analyst resubmits
8. Back to reviewer
```

#### If Approved:
```
1. Reviewer clicks "Approve"
2. Finding status: 'approved'
3. Finding locked (no more edits)
4. Manager gets notification
```

---

## 4. Report Generation Flow

### A. Manager Generates Report

#### Step 1: Select Template
```
1. Manager opens project
2. Clicks "Generate Report"
3. Selects template:
   - Standard Pentest Report
   - Executive Summary
   - Compliance Report (PCI-DSS, HIPAA)
   - Custom Template
```

#### Step 2: Configure Report
```
1. Manager selects:
   - Which findings to include
   - Report sections
   - Branding (logo, colors)
2. Manager adds:
   - Executive Summary
   - Methodology
   - Scope
   - Conclusion
```

#### Step 3: Generate & Review
```
1. System generates report:
   - Combines all approved findings
   - Applies template
   - Generates charts (severity distribution)
   - Formats evidence
2. Manager previews report
3. Manager can:
   - Edit sections
   - Regenerate
   - Export to DOCX/PDF
```

#### Step 4: Finalize & Share
```
1. Manager clicks "Finalize Report"
2. System:
   - Saves to Google Drive
   - Generates shareable link
   - Creates PDF version
3. Manager shares with client
4. Client gets email with link
```

### B. Client Views Report

```
1. Client clicks link in email
2. Client logs in (if required)
3. Client sees:
   - Executive Summary
   - Findings (sanitized)
   - Risk Summary
   - Recommendations
4. Client can:
   - Download PDF
   - Download DOCX
   - View online
5. Client CANNOT see:
   - Internal comments
   - Version history
   - Analyst notes
```

---

## 5. Finding Library Flow

### A. Create Template (Manager)
```
1. Manager clicks "Finding Library"
2. Clicks "Add Template"
3. Enters:
   - Vulnerability Name (SQL Injection)
   - Default Severity
   - Description template
   - Remediation template
   - References
4. Saves template
```

### B. Use Template (Analyst)
```
1. Analyst creating new finding
2. Clicks "Use Template"
3. Selects "SQL Injection"
4. System pre-fills:
   - Description
   - Remediation
   - References
5. Analyst customizes for specific case
6. Continues normal flow
```

---

## 6. Natural Language Search Flow

### User Queries System
```
User types: "Show all critical findings from last month"

System:
1. Parses query using AI
2. Extracts:
   - Severity: Critical
   - Date range: Last month
3. Queries database
4. Applies RBAC filters
5. Returns results:
   - Finding titles
   - Project names
   - Dates
   - Links to view
```

### Example Queries & Responses

**Query:** "When did I report SQL Injection for Project X?"
```
Response:
- Finding: SQL Injection in Login Form
- Project: Project X
- Created: March 15, 2026
- Status: Approved
- [View Finding]
```

**Query:** "Which client has the most high severity issues?"
```
Response:
- Client: Acme Corp
- High Severity: 12 findings
- Critical: 3 findings
- [View Project]
```

---

## 7. Dashboard Views by Role

### Analyst Dashboard
```
Shows:
- My Projects
- Findings in Progress
- Findings Pending Review
- Recent Activity
- Quick Actions:
  - Create Finding
  - Upload Evidence
  - View Templates
```

### Reviewer Dashboard
```
Shows:
- Findings Pending My Review
- Recently Approved
- Changes Requested
- Team Activity
- Quick Actions:
  - Review Findings
  - Add Comments
```

### Manager Dashboard
```
Shows:
- All Projects
- Pending Approvals
- Report Status
- Team Performance
- Findings by Severity (Chart)
- Quick Actions:
  - Create Project
  - Generate Report
  - Manage Users
  - Approve Findings
```

### Client Dashboard
```
Shows:
- My Reports
- Project Status
- Findings Summary
- Download Links
- Quick Actions:
  - View Report
  - Download PDF
```

---

## 8. Version Control Flow

### Every Edit Creates New Version
```
Version 1: Initial AI generation
Version 2: Analyst edited description
Version 3: Analyst added more evidence
Version 4: Changes after reviewer feedback
Version 5: Final approved version
```

### View Version History
```
1. User opens finding
2. Clicks "Version History"
3. Sees timeline:
   - V1: Created by John (Analyst) - Mar 15, 10:00 AM
   - V2: Edited by John (Analyst) - Mar 15, 11:30 AM
   - V3: Edited by John (Analyst) - Mar 15, 2:00 PM
   - V4: Approved by Sarah (Reviewer) - Mar 15, 3:00 PM
4. Can view any previous version
5. Can compare versions (diff view)
```

---

## 9. Activity Log Flow

### System Logs Everything
```
- User login/logout
- Finding created
- Finding edited
- Finding submitted
- Finding approved
- Report generated
- User role changed
- Template created
- Evidence uploaded
```

### View Activity Log
```
1. Manager clicks "Activity Logs"
2. Sees timeline of all actions
3. Can filter by:
   - User
   - Action type
   - Date range
   - Project
4. Can export audit log
```

---

## 10. Security Controls Flow

### A. Data Sanitization (Before AI)
```
Input: "Found SQL injection at https://internal-api.company.com/api/users?id=1' OR '1'='1"

Sanitized: "Found SQL injection at [INTERNAL_URL]/api/users?id=1' OR '1'='1"

Sent to AI: Safe version
AI Response: Generated finding
Restored: Original URLs in final finding
```

### B. Session Management
```
1. User logs in
2. JWT token issued (expires in 1 hour)
3. Refresh token issued (expires in 7 days)
4. After 30 min inactivity: Warning
5. After 1 hour: Auto logout
6. User must log in again
```

### C. Input Validation
```
All inputs validated:
- Email format
- Password strength
- File types (only images, PDFs, text)
- File size (max 10MB)
- SQL injection prevention
- XSS prevention
```

---

## 11. Complete User Journey Example

### Scenario: Pentester finds SQL Injection

```
Day 1 - 9:00 AM: Analyst John starts testing
Day 1 - 10:30 AM: John finds SQL injection
Day 1 - 10:35 AM: John uploads screenshot
Day 1 - 10:40 AM: John generates finding with AI
Day 1 - 10:45 AM: John reviews and edits
Day 1 - 10:50 AM: John submits for review

Day 1 - 2:00 PM: Reviewer Sarah gets notification
Day 1 - 2:15 PM: Sarah reviews finding
Day 1 - 2:20 PM: Sarah requests more details on impact
Day 1 - 2:21 PM: John gets notification

Day 1 - 3:00 PM: John adds impact details
Day 1 - 3:05 PM: John resubmits
Day 1 - 3:30 PM: Sarah approves

Day 2 - 9:00 AM: Manager Mike generates report
Day 2 - 9:30 AM: Mike reviews report
Day 2 - 10:00 AM: Mike finalizes and shares with client
Day 2 - 10:05 AM: Client receives email
Day 2 - 10:30 AM: Client downloads report
```

---

## Summary: Key Flows

1. ✅ **Authentication**: Signup → Approval → Login
2. ✅ **Project Management**: Create → Assign → Track
3. ✅ **Finding Creation**: Evidence → AI → Review → Approve
4. ✅ **Report Generation**: Select → Configure → Generate → Share
5. ✅ **Version Control**: Every edit tracked
6. ✅ **Activity Logging**: All actions logged
7. ✅ **Natural Language Search**: Query → Parse → Results
8. ✅ **Security**: Sanitize → Validate → Audit

This is the complete flow for SecurifyAI! 🎉
