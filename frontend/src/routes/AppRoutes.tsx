import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import DashboardPage from '../pages/DashboardPage';
import UsersManagementPage from '../pages/UsersManagementPage';
import SignInPage from '../pages/SignInPage';
import SignUpPage from '../pages/SignUpPage';
import NotFoundPage from '../pages/NotFoundPage';
import FindingLibraryPage from '../pages/FindingLibraryPage';
import ProjectsPage from '../pages/ProjectsPage';
import ActivityLogsPage from '../pages/ActivityLogsPage';
import FindingDetailPage from '../pages/FindingDetailPage';
import ReportBuilderPage from '../pages/ReportBuilderPage';
import ReportViewPage from '../pages/ReportViewPage';
import SearchIntelPage from '../pages/SearchIntelPage';
import ProfileSettingsPage from '../pages/ProfileSettingsPage';
import RBACSettingsPage from '../pages/RBACSettingsPage';
import AuthCallbackPage from '../pages/AuthCallbackPage';

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
        <Route path="projects/:projectId/report" element={<ReportBuilderPage />} />
        <Route path="reports/:projectId/view" element={<ReportViewPage />} />
        <Route path="search" element={<SearchIntelPage />} />
        <Route path="finding-library" element={<FindingLibraryPage />} />
        <Route path="findings/:id" element={<FindingDetailPage />} />
        <Route path="activity" element={<ActivityLogsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="settings" element={<RBACSettingsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
