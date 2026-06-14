import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleGuard from '../components/auth/RoleGuard';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useAuth } from '../contexts/AuthContext';
import DashboardPage from '../pages/DashboardPage';
import UsersManagementPage from '../pages/UsersManagementPage';
import SignInPage from '../pages/SignInPage';
import SignUpPage from '../pages/SignUpPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProjectsPage from '../pages/ProjectsPage';
import FindingDetailPage from '../pages/FindingDetailPage';
import ReportBuilderPage from '../pages/ReportBuilderPage';
import ReportViewPage from '../pages/ReportViewPage';
import SearchIntelPage from '../pages/SearchIntelPage';
import ProfileSettingsPage from '../pages/ProfileSettingsPage';
import RBACSettingsPage from '../pages/RBACSettingsPage';
import AuthCallbackPage from '../pages/AuthCallbackPage';
import TemplateManagementPage from '../pages/TemplateManagementPage';
import TemplateEditorPage from '../pages/TemplateEditorPage';
import ReportTemplatesPage from '../pages/ReportTemplatesPage';
import ImportFindingsPage from '../pages/ImportFindingsPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import ProjectReviewPage from '../pages/ProjectReviewPage';
import CreateProjectPage from '../pages/CreateProjectPage';
import CreateFindingPage from '../pages/CreateFindingPage';
import GenerateFindingAIPage from '../pages/GenerateFindingAIPage';
import ApproveUserPage from '../pages/ApproveUserPage';
import CreateManagerPage from '../pages/CreateManagerPage';
import EditUserPage from '../pages/EditUserPage';
import RoleRequestPage from '../pages/RoleRequestPage';

// Component to redirect based on role
const RoleBasedHome = () => {
  const { hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager');
  
  // Managers and Admins see Dashboard
  // Reporters see Projects
  return isAdminOrManager ? <DashboardPage /> : <Navigate to="/projects" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes - No Layout */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      
      {/* App Routes - With Layout and Protection */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Home - Role-based redirect */}
        <Route index element={<RoleBasedHome />} />
        
        {/* Projects - All authenticated users with permission */}
        <Route path="projects" element={
          <PermissionGuard requiredPermissions={['view_projects']}>
            <ProjectsPage />
          </PermissionGuard>
        } />
        
        {/* Create Project - Admin/Manager only */}
        <Route path="projects/new" element={
          <RoleGuard allowedRoles={['admin', 'manager']}>
            <CreateProjectPage />
          </RoleGuard>
        } />
        
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        
        {/* Project Review - Manager/Admin only */}
        <Route path="projects/:projectId/review" element={
          <RoleGuard allowedRoles={['admin', 'manager']}>
            <ProjectReviewPage />
          </RoleGuard>
        } />
        
        <Route path="projects/:projectId/findings/new" element={<CreateFindingPage />} />
        <Route path="projects/:projectId/findings/generate" element={<GenerateFindingAIPage />} />
        <Route path="projects/:projectId/report" element={<ReportBuilderPage />} />
        <Route path="projects/:projectId/report/import" element={<ImportFindingsPage />} />
        <Route path="reports/:projectId/view" element={<ReportViewPage />} />
        
        {/* Templates - Users with permission */}
        <Route path="templates" element={
          <PermissionGuard requiredPermissions={['view_templates']}>
            <ReportTemplatesPage />
          </PermissionGuard>
        } />
        <Route path="templates/:templateId" element={<TemplateEditorPage />} />
        
        {/* Search - Admin/Manager only */}
        <Route path="search" element={
          <RoleGuard allowedRoles={['admin', 'manager']}>
            <SearchIntelPage />
          </RoleGuard>
        } />
        
        <Route path="findings/:id" element={<FindingDetailPage />} />
        
        {/* Users Management - Users with permission */}
        <Route path="users" element={
          <PermissionGuard requiredPermissions={['view_users']}>
            <UsersManagementPage />
          </PermissionGuard>
        } />
        
        {/* Create Manager - Admin only */}
        <Route path="users/create-manager" element={
          <RoleGuard allowedRoles={['admin']}>
            <CreateManagerPage />
          </RoleGuard>
        } />
        
        {/* User Management - Permission-based */}
        <Route path="users/:userId/approve" element={
          <PermissionGuard requiredPermissions={['approve_users']}>
            <ApproveUserPage />
          </PermissionGuard>
        } />
        <Route path="users/:userId/edit" element={
          <PermissionGuard requiredPermissions={['edit_users']}>
            <EditUserPage />
          </PermissionGuard>
        } />
        
        {/* RBAC Settings - Admin only */}
        <Route path="settings" element={
          <RoleGuard allowedRoles={['admin']}>
            <RBACSettingsPage />
          </RoleGuard>
        } />
        
        {/* Profile - All authenticated users */}
        <Route path="profile" element={<ProfileSettingsPage />} />
        <Route path="profile/role-request" element={<RoleRequestPage />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
