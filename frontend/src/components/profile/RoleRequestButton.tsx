import React from 'react';
import { UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RoleRequestButtonProps {
  currentRole: string;
  hasPendingRequest?: boolean;
}

export const RoleRequestButton: React.FC<RoleRequestButtonProps> = ({
  currentRole,
  hasPendingRequest = false,
}) => {
  const navigate = useNavigate();

  // Don't show button if user is already manager or admin
  if (currentRole === 'manager' || currentRole === 'admin') {
    return null;
  }

  if (hasPendingRequest) {
    return (
      <div className="p-3 bg-surface-high border border-outline rounded-lg">
        <p className="text-sm text-on-surface-variant">
          You have a pending role change request. Please wait for manager approval.
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={() => navigate('/profile/role-request')}
      className="bg-primary text-surface hover:bg-primary/90"
    >
      <UserCog className="w-4 h-4 mr-2" />
      Request Role Change
    </Button>
  );
};
