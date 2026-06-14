import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

const RoleGuard = ({ children, allowedRoles, redirectTo = '/projects' }: RoleGuardProps) => {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const hasAccess = allowedRoles.some(role => hasRole(role));

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
