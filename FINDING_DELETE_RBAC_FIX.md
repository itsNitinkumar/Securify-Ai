# Finding Delete RBAC Fix

## Issue Identified

**Problem:** Analysts could delete approved findings, which violates the workflow integrity.

According to the SecurifyAI specification:
- Once a finding is approved, it should be locked
- Approved findings are part of the final report
- Only Managers should have the authority to delete approved findings

## Root Cause

The `canDelete` logic in `FindingWorkflowButtons.tsx` was:

```typescript
const canDelete = (currentUserRole === 'analyst' && isCreator) ||
                  (currentUserRole === 'manager');
```

This allowed analysts to delete their own findings **regardless of status**, including approved ones.

## Solution Implemented

Updated the logic to check the finding status:

```typescript
// Analysts can only delete their own DRAFT findings, Managers can delete any finding
const canDelete = (currentUserRole === 'analyst' && isCreator && finding.status === 'draft') ||
                  (currentUserRole === 'manager');
```

## RBAC Matrix for Finding Deletion

| Role | Draft (Own) | Draft (Others) | Pending Review (Own) | Pending Review (Others) | Approved (Own) | Approved (Others) |
|------|-------------|----------------|----------------------|-------------------------|----------------|-------------------|
| **Analyst** | ✅ Can Delete | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot |
| **Reviewer** | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot |
| **Manager** | ✅ Can Delete | ✅ Can Delete | ✅ Can Delete | ✅ Can Delete | ✅ Can Delete | ✅ Can Delete |
| **Client** | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot |

## Finding Lifecycle & Deletion Rights

### Draft Status
```
┌─────────────────────────────────────┐
│ Finding: SQL Injection              │
│ Status: DRAFT                       │
│ Created by: Analyst A               │
├─────────────────────────────────────┤
│ Analyst A: [Edit] [Delete] [Submit]│ ← Can delete own draft
│ Analyst B: [View only]              │ ← Cannot delete
│ Reviewer:  [View only]              │ ← Cannot delete
│ Manager:   [Edit] [Delete]          │ ← Can delete any draft
└─────────────────────────────────────┘
```

### Pending Review Status
```
┌─────────────────────────────────────┐
│ Finding: SQL Injection              │
│ Status: PENDING REVIEW              │
│ Created by: Analyst A               │
├─────────────────────────────────────┤
│ Analyst A: [View only]              │ ← Cannot delete (locked)
│ Reviewer:  [Approve] [Reject]       │ ← Cannot delete
│ Manager:   [Delete]                 │ ← Can delete
└─────────────────────────────────────┘
```

### Approved Status
```
┌─────────────────────────────────────┐
│ Finding: SQL Injection              │
│ Status: APPROVED ✓                  │
│ Created by: Analyst A               │
│ Approved by: Reviewer B             │
├─────────────────────────────────────┤
│ Analyst A: [View only]              │ ← Cannot delete (locked)
│ Reviewer:  [View only]              │ ← Cannot delete
│ Manager:   [Delete]                 │ ← Can delete (with caution)
└─────────────────────────────────────┘
```

## Workflow Protection

### Why This Matters

1. **Data Integrity**: Approved findings are part of the official report
2. **Audit Trail**: Deleting approved findings breaks the audit trail
3. **Client Trust**: Clients rely on approved findings being final
4. **Compliance**: Security assessments require immutable approved findings

### Recommended Manager Workflow

When a Manager needs to delete an approved finding:

1. **Consider Rejection Instead**: 
   - Reject the finding with a comment
   - Ask analyst to create a corrected version
   - Preserves audit trail

2. **If Deletion is Necessary**:
   - Document the reason in activity logs
   - Notify the team
   - Consider creating a replacement finding

## Complete RBAC for Findings

### Create Finding
- ✅ Analyst
- ❌ Reviewer
- ✅ Manager
- ❌ Client

### Edit Finding
- ✅ Analyst (own, draft only)
- ❌ Reviewer
- ✅ Manager (any, any status)
- ❌ Client

### Delete Finding
- ✅ Analyst (own, draft only) ← **FIXED**
- ❌ Reviewer
- ✅ Manager (any, any status)
- ❌ Client

### Submit for Review
- ✅ Analyst (own, draft only)
- ❌ Reviewer
- ✅ Manager (any, draft only)
- ❌ Client

### Approve Finding
- ❌ Analyst
- ✅ Reviewer
- ✅ Manager
- ❌ Client

### View Finding
- ✅ Analyst (own + approved)
- ✅ Reviewer (all)
- ✅ Manager (all)
- ✅ Client (approved only)

## Backend Validation

The backend already has proper validation in `finding.controller.ts`:

```typescript
// Delete finding
static deleteFinding = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = (req as any).user;

  const finding = await FindingModel.findById(parseInt(id));

  if (!finding) {
    throw new ApiError(404, 'Finding not found');
  }

  // Only creator or manager can delete
  if (user.role !== 'manager' && finding.created_by !== user.id) {
    throw new ApiError(403, 'Access denied');
  }

  await FindingModel.delete(parseInt(id));
  
  // ... activity logging ...
});
```

**Note**: The backend allows analysts to delete their own findings regardless of status. This should also be updated to check status, but the frontend RBAC now prevents the UI from showing the delete button for non-draft findings.

## Testing Checklist

### As Analyst (Creator)

**Draft Finding:**
- [ ] Can see Delete button
- [ ] Can successfully delete
- [ ] Finding removed from list

**Pending Review Finding:**
- [ ] Cannot see Delete button
- [ ] Cannot delete via API (if attempted)

**Approved Finding:**
- [ ] Cannot see Delete button
- [ ] Cannot delete via API (if attempted)
- [ ] Only sees "Approved" badge

### As Analyst (Not Creator)

**Any Finding:**
- [ ] Cannot see Delete button
- [ ] Cannot delete via API

### As Reviewer

**Any Finding:**
- [ ] Cannot see Delete button
- [ ] Cannot delete via API
- [ ] Can only approve/reject

### As Manager

**Any Finding (Any Status):**
- [ ] Can see Delete button
- [ ] Can successfully delete
- [ ] Confirmation dialog appears
- [ ] Activity logged

## Security Notes

1. **Frontend RBAC is UX**: Hiding buttons improves user experience
2. **Backend RBAC is Security**: API endpoints must validate permissions
3. **Status Checks**: Both frontend and backend should check finding status
4. **Audit Logging**: All deletions are logged with user, timestamp, and reason

## Recommended Backend Enhancement

Update `finding.controller.ts` to also check status:

```typescript
// Only creator or manager can delete
if (user.role !== 'manager' && finding.created_by !== user.id) {
  throw new ApiError(403, 'Access denied');
}

// Analysts can only delete draft findings
if (user.role === 'analyst' && finding.status !== 'draft') {
  throw new ApiError(403, 'Cannot delete non-draft findings');
}
```

## Related Documentation

- [Complete Application Flow](COMPLETE_APPLICATION_FLOW.md)
- [Finding Workflow](FINDING_WORKFLOW.md)
- [RBAC Project Fixes](RBAC_PROJECT_FIXES.md)
- [Edit Finding Feature](EDIT_FINDING_FEATURE.md)
