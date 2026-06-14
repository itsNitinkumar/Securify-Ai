import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermissions: string[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * PermissionGuard - Restricts access based on user permissions
 * 
 * Usage:
 * <PermissionGuard requiredPermissions={['view_users', 'edit_users']}>
 *   <UsersPage />
 * </PermissionGuard>
 * 
 * Or with fallback:
 * <PermissionGuard 
 *   requiredPermissions={['delete_findings']} 
 *   fallback={<div>You don't have permission to delete</div>}
 * >
 *   <DeleteButton />
 * </PermissionGuard>
 */
const PermissionGuard = ({ 
  children, 
  requiredPermissions, 
  requireAll = false,
  redirectTo = '/projects',
  fallback 
}: PermissionGuardProps) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const hasAccess = requireAll
    ? requiredPermissions.every(permission => hasPermission(permission))
    : requiredPermissions.some(permission => hasPermission(permission));

  if (!hasAccess) {
    console.warn(`Permission denied: User missing permissions:`, {
      required: requiredPermissions,
      requireAll,
      userRole: user.role
    });
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
