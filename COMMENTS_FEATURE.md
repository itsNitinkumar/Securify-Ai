# Comments Feature Documentation

## Overview
Added complete comments system for findings, allowing team collaboration and feedback during the review process.

## According to Spec (Page 2)
> **Reviewer / Team Lead:**
> - Reviews findings
> - **Adds comments**
> - Requests modifications
> - Approves findings

## Features Implemented

### 1. Add Comments
- All authenticated users can add comments to findings
- Real-time comment posting
- Character limit: unlimited (reasonable use expected)

### 2. View Comments
- All users can view comments on findings
- Comments show:
  - Author name
  - Author role (with colored badge)
  - Timestamp
  - Comment text

### 3. Edit Comments
- Users can edit their own comments
- Managers can edit any comment
- Inline editing with save/cancel

### 4. Delete Comments
- Users can delete their own comments
- Managers can delete any comment
- Confirmation dialog before deletion

## Database Schema

### Table: `finding_comments`
```sql
CREATE TABLE IF NOT EXISTS finding_comments (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER REFERENCES findings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backend Implementation

### Model: `comment.model.ts`
```typescript
class CommentModel {
  static async create(findingId: number, userId: number, comment: string)
  static async findByFinding(findingId: number)
  static async findById(id: number)
  static async update(id: number, comment: string)
  static async delete(id: number)
}
```

### Controller: `comment.controller.ts`
```typescript
class CommentController {
  static createComment    // POST /comments
  static getCommentsByFinding  // GET /comments/finding/:finding_id
  static updateComment    // PUT /comments/:id
  static deleteComment    // DELETE /comments/:id
}
```

### Routes: `comment.routes.ts`
```typescript
POST   /api/comments                    // Create comment
GET    /api/comments/finding/:finding_id  // Get comments
PUT    /api/comments/:id                // Update comment
DELETE /api/comments/:id                // Delete comment
```

## Frontend Implementation

### API: `commentApi.ts`
```typescript
export const commentApi = {
  create: (findingId: number, comment: string)
  getByFinding: (findingId: number)
  update: (id: number, comment: string)
  delete: (id: number)
}
```

### Component: `FindingComments.tsx`
Features:
- Comment form with textarea
- Comments list with author info
- Inline editing
- Delete confirmation
- Role-based badges
- Timestamp formatting
- Loading states
- Empty state

### Integration: `FindingViewer.tsx`
- Comments section added after Evidence
- Passes findingId, currentUserId, currentUserRole
- Automatically loads comments when finding opens

## RBAC (Role-Based Access Control)

### Create Comment
- ✅ **Analyst**: Can comment
- ✅ **Reviewer**: Can comment
- ✅ **Manager**: Can comment
- ✅ **Client**: Can comment (on approved findings)

### View Comments
- ✅ **All roles**: Can view comments

### Edit Comment
- ✅ **Comment Author**: Can edit own comments
- ✅ **Manager**: Can edit any comment
- ❌ **Others**: Cannot edit

### Delete Comment
- ✅ **Comment Author**: Can delete own comments
- ✅ **Manager**: Can delete any comment
- ❌ **Others**: Cannot delete

## UI/UX Details

### Comment Form
```
┌─────────────────────────────────────────┐
│ Add a comment...                        │
│                                         │
│                                         │
└─────────────────────────────────────────┘
                    [Post Comment] →
```

### Comment Display
```
┌─────────────────────────────────────────┐
│ John Doe [Reviewer] • 2 mins ago  [✏️][🗑️]│
│                                         │
│ This finding needs more details about   │
│ the impact. Please add information     │
│ about data exposure.                    │
└─────────────────────────────────────────┘
```

### Role Badges
- **Manager**: Purple badge
- **Reviewer**: Blue badge
- **Analyst**: Green badge
- **Client**: Gray badge

### Empty State
```
┌─────────────────────────────────────────┐
│           💬                            │
│      No comments yet                    │
│   Be the first to comment               │
└─────────────────────────────────────────┘
```

## Example Usage

### Scenario 1: Reviewer Requests Changes
```
1. Reviewer opens finding
2. Scrolls to Comments section
3. Types: "Please add more details about the exploitation steps"
4. Clicks "Post Comment"
5. Comment appears with Reviewer badge
6. Analyst receives notification (future feature)
7. Analyst reads comment and updates finding
```

### Scenario 2: Team Discussion
```
Analyst: "I found this SQL injection in the login form"
Reviewer: "Can you verify if it works with other parameters?"
Analyst: "Yes, tested with username and email parameters"
Manager: "Great work! Please add this to the PoC section"
```

### Scenario 3: Edit Comment
```
1. User posts comment with typo
2. Clicks edit icon (✏️)
3. Textarea appears with current text
4. User fixes typo
5. Clicks "Save"
6. Comment updates
```

## Sample Data for Testing

### As Reviewer:
```
Comment 1:
"This finding looks good, but please add more details about the likelihood assessment. How easy is it to exploit?"

Comment 2:
"The remediation section needs to include specific code examples for the development team."

Comment 3:
"Approved! Great work on documenting the steps to reproduce."
```

### As Analyst:
```
Comment 1:
"Updated the likelihood section with exploitation difficulty details."

Comment 2:
"Added code examples in the remediation section. Please review."

Comment 3:
"Thank you! I've also added references to OWASP guidelines."
```

### As Manager:
```
Comment 1:
"This is a critical finding. Please prioritize this for the client report."

Comment 2:
"Good collaboration team! This finding is ready for the final report."

Comment 3:
"@Analyst please ensure all evidence files are properly captioned before final submission."
```

## Activity Logging

All comment actions are logged:
```typescript
{
  user_id: 1,
  action: 'ADD_COMMENT',
  entity_type: 'finding',
  entity_id: 123,
  details: { comment: "This finding needs..." },
  ip_address: "192.168.1.100",
  user_agent: "Mozilla/5.0...",
  timestamp: "2026-04-14T10:30:00Z"
}
```

## Security Features

### Input Validation
- Comment text is required
- Maximum length: reasonable (no hard limit, but sanitized)
- XSS protection through React's built-in escaping

### Authorization
- Backend validates user permissions
- Frontend hides edit/delete for unauthorized users
- Database foreign keys ensure data integrity

### Audit Trail
- All comment actions logged
- Timestamps preserved
- User information tracked

## Future Enhancements

### Possible Improvements
1. **Mentions**: @username to notify specific users
2. **Notifications**: Email/in-app notifications for new comments
3. **Rich Text**: Markdown support for formatting
4. **Attachments**: Add files to comments
5. **Reactions**: Like/emoji reactions to comments
6. **Threading**: Reply to specific comments
7. **Search**: Search within comments
8. **Export**: Include comments in reports

## Testing Checklist

### Basic Functionality
- [ ] Can add comment
- [ ] Can view comments
- [ ] Can edit own comment
- [ ] Can delete own comment
- [ ] Manager can edit any comment
- [ ] Manager can delete any comment
- [ ] Comments load on finding open
- [ ] Comments refresh after actions

### RBAC
- [ ] Analyst can comment
- [ ] Reviewer can comment
- [ ] Manager can comment
- [ ] Client can comment (on approved findings)
- [ ] Cannot edit others' comments (non-manager)
- [ ] Cannot delete others' comments (non-manager)

### UI/UX
- [ ] Comment form is visible
- [ ] Post button disabled when empty
- [ ] Loading state shows while posting
- [ ] Comments display with correct info
- [ ] Role badges show correct colors
- [ ] Timestamps format correctly
- [ ] Edit mode works properly
- [ ] Delete confirmation appears
- [ ] Empty state shows when no comments

### Edge Cases
- [ ] Long comments wrap properly
- [ ] Special characters display correctly
- [ ] Multiple rapid comments work
- [ ] Edit then cancel works
- [ ] Delete while editing works
- [ ] Network errors handled gracefully

## Related Documentation
- [Complete Application Flow](COMPLETE_APPLICATION_FLOW.md)
- [Finding Workflow](FINDING_WORKFLOW.md)
- [RBAC Project Fixes](RBAC_PROJECT_FIXES.md)
- [SecurifyAI Specification](SecurifyAI_Spec.pdf)
