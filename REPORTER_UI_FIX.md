# Reporter UI Navigation Fix

## Problem
Reporters could see navigation items they shouldn't have access to:
- ❌ Dashboard (shows 403 errors)
- ❌ Search (manager/admin only)

## Solution Applied

### 1. Fixed Sidebar Navigation (`frontend/src/layouts/MainLayout.tsx`)

**Before:**
```typescript
{ path: '/', label: 'Dashboard', icon: LayoutDashboard, show: true }, // ❌ Everyone
{ path: '/search', label: 'Search', icon: Search, show: true }, // ❌ Everyone
```

**After:**
```typescript
{ path: '/', label: 'Dashboard', icon: LayoutDashboard, show: isAdminOrManager }, // ✅ Admin/Manager only
{ path: '/search', label: 'Search', icon: Search, show: isAdminOrManager }, // ✅ Admin/Manager only
```

### 2. Added Role-Based Home Redirect (`frontend/src/routes/AppRoutes.tsx`)

**Before:**
```typescript
<Route index element={<DashboardPage />} /> // ❌ Everyone goes to dashboard
```

**After:**
```typescript
<Route index element={<RoleBasedHome />} /> // ✅ Smart redirect

// RoleBasedHome component:
// - Admin/Manager → Dashboard
// - Reporter → Projects (redirected automatically)
```

---

## What Each Role Sees Now

### 👤 Reporter Role:
**Sidebar:**
- ✅ Projects
- ✅ Templates
- ✅ Profile (via avatar click)

**Home page:** `/projects` (auto-redirected from `/`)

**Can access:**
- Projects page
- Create/edit findings
- Generate reports
- View templates
- Profile settings

**Cannot see:**
- ❌ Dashboard (hidden from sidebar + auto-redirected)
- ❌ Search (hidden from sidebar)
- ❌ Users (hidden from sidebar)
- ❌ RBAC Settings (hidden from sidebar)

---

### 👨‍💼 Manager Role:
**Sidebar:**
- ✅ Dashboard
- ✅ Projects
- ✅ Templates
- ✅ Search
- ✅ Users
- ✅ Profile (via avatar click)

**Home page:** `/` (Dashboard)

**Can access:**
- Everything reporters can + management features

---

### 👑 Admin Role:
**Sidebar:**
- ✅ Dashboard
- ✅ Projects
- ✅ Templates
- ✅ Search
- ✅ Users
- ✅ RBAC Settings
- ✅ Profile (via avatar click)

**Home page:** `/` (Dashboard)

**Can access:**
- Everything + RBAC settings

---

## Testing

### Test as Reporter:
1. Login as reporter
2. Should land on `/projects` page
3. Sidebar should show: Projects, Templates only
4. No Dashboard or Search links
5. If manually navigate to `/` → auto-redirected to `/projects`
6. If manually navigate to `/search` → Can access but not shown in sidebar

### Test as Manager:
1. Login as manager
2. Should land on `/` (Dashboard)
3. Sidebar shows: Dashboard, Projects, Templates, Search, Users
4. All links work correctly

### Test as Admin:
1. Login as admin
2. Should land on `/` (Dashboard)
3. Sidebar shows: Dashboard, Projects, Templates, Search, Users, RBAC Settings
4. All links work correctly

---

## Backend Protection (Already Working)

The backend routes are already protected correctly:

- `/dashboard/reporters/top` → Requires manager/admin permissions ✅
- `/search` → Requires appropriate permissions ✅
- `/users` → Requires `view_users` permission ✅

The 403 errors you saw were CORRECT - reporters shouldn't access those endpoints.

Now the frontend matches the backend protection!

---

## Summary

✅ **Fixed:** Reporters no longer see Dashboard or Search in sidebar
✅ **Fixed:** Reporters land on Projects page by default
✅ **Fixed:** UI now matches backend permissions
✅ **Result:** Clean, role-appropriate navigation for each user type

---

## Old User Fix Reminder

Don't forget to fix the existing user in database:

```sql
-- Update the user with role_id
UPDATE users 
SET role = 'reporter',
    role_id = (SELECT id FROM roles WHERE slug = 'reporter'),
    status = 'active'
WHERE email = 'kumaranish0750@gmail.com';
```

Then have them logout and login again to get fresh token with correct role_id.
