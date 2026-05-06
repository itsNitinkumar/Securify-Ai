import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import DashboardPage from '../pages/DashboardPage';
import UsersManagementPage from '../pages/UsersManagementPage';
import SignInPage from '../pages/SignInPage';
import SignUpPage from '../pages/SignUpPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProjectsPage from '../pages/ProjectsPage';
import ActivityLogsPage from '../pages/ActivityLogsPage';
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
import ProjectDetailPage from '../pages/ProjectDetailPage';
import CreateProjectPage from '../pages/CreateProjectPage';
import CreateFindingPage from '../pages/CreateFindingPage';
import GenerateFindingAIPage from '../pages/GenerateFindingAIPage';
import ApproveUserPage from '../pages/ApproveUserPage';
import CreateManagerPage from '../pages/CreateManagerPage';
import EditUserPage from '../pages/EditUserPage';
import RoleRequestPage from '../pages/RoleRequestPage';
import FindingLibraryPage from '../pages/FindingLibraryPage';
import FindingTemplateDetailPage from '../pages/FindingTemplateDetailPage';
import FindingTemplateCreatePage from '../pages/FindingTemplateCreatePage';

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
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<CreateProjectPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/findings/new" element={<CreateFindingPage />} />
        <Route path="projects/:projectId/findings/generate" element={<GenerateFindingAIPage />} />
        <Route path="projects/:projectId/report" element={<ReportBuilderPage />} />
        <Route path="reports/:projectId/view" element={<ReportViewPage />} />
        <Route path="templates" element={<ReportTemplatesPage />} />
        <Route path="templates/:templateId" element={<TemplateEditorPage />} />
        <Route path="search" element={<SearchIntelPage />} />
        <Route path="findings/:id" element={<FindingDetailPage />} />
        <Route path="finding-library" element={<FindingLibraryPage />} />
        <Route path="finding-library/new" element={<FindingTemplateCreatePage />} />
        <Route path="finding-library/:templateId" element={<FindingTemplateDetailPage />} />
        <Route path="activity" element={<ActivityLogsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="users/create-manager" element={<CreateManagerPage />} />
        <Route path="users/:userId/approve" element={<ApproveUserPage />} />
        <Route path="users/:userId/edit" element={<EditUserPage />} />
        <Route path="settings" element={<RBACSettingsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
        <Route path="profile/role-request" element={<RoleRequestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
