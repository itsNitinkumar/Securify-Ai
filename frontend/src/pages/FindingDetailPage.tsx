import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
} from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FindingContent from '@/components/findings/FindingContent';
import InlineConfirm from '@/components/ui/inline-confirm';
import { toast } from 'react-hot-toast';

const FindingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasPermission, hasRole } = useAuth();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(() => searchParams.get('edit') === 'true');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastKnownProjectId, setLastKnownProjectId] = useState<number | null>(null);
  const currentUserId = parseInt(user?.id || '0');

  useEffect(() => {
    if (searchParams.get('edit') === 'true' && !isEditing && hasPermission('edit_findings')) {
      setIsEditing(true);
    }
  }, [searchParams, isEditing, hasPermission]);

  useEffect(() => {
    let isMounted = true;

    if (id && !isDeleting) {
      const load = async () => {
        try {
          setLoading(true);
          const response = await findingApi.getFinding(parseInt(id));
          const findingData = (response.data as any)?.data || response.data;
          if (isMounted) {
            setFinding(findingData);
            if (findingData?.project_id) {
              setLastKnownProjectId(findingData.project_id);
            }
          }
        } catch (error: any) {
          console.error('Failed to load finding:', error);

          if (error?.response?.status === 404) {
            const redirectTo = lastKnownProjectId
              ? `/projects/${lastKnownProjectId}`
              : '/dashboard';
            navigate(redirectTo, { replace: true });
            return;
          }

          if (isMounted) {
            setFinding(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      load();
    }

    return () => {
      isMounted = false;
    };
  }, [id, isDeleting, navigate, lastKnownProjectId]);

  const loadFinding = async () => {
    if (isDeleting) return;
    try {
      setLoading(true);
      const response = await findingApi.getFinding(parseInt(id!));
      const findingData = (response.data as any)?.data || response.data;
      setFinding(findingData);
      if (findingData?.project_id) {
        setLastKnownProjectId(findingData.project_id);
      }
    } catch (error: any) {
      console.error('Failed to load finding:', error);

      if (error?.response?.status === 404) {
        const redirectTo = lastKnownProjectId
          ? `/projects/${lastKnownProjectId}`
          : '/dashboard';
        navigate(redirectTo, { replace: true });
        return;
      }

      setFinding(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting || !finding) return;

    setIsDeleting(true);
    setConfirmDelete(false);

    const projectId = finding.project_id;
    const navigateTo = projectId
      ? `/projects/${projectId}`
      : '/dashboard';

    navigate(navigateTo, { replace: true });
    toast.success('Finding deleted');

    try {
      await findingApi.deleteFinding(parseInt(id!));
    } catch (error) {
      console.error('Failed to delete finding:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading finding...</p>
        </div>
      </div>
    );
  }

  if (!finding) {
    return null;
  }

  const severityColors: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const handleBack = () => {
    const from = searchParams.get('from');
    if (from === 'review' && finding?.project_id) {
      navigate(`/projects/${finding.project_id}/review`);
    } else if (finding?.project_id) {
      navigate(`/projects/${finding.project_id}`);
    } else {
      navigate('/projects');
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4 text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className={severityColors[finding.severity]}>
                {finding.severity.toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
              {finding.title}
            </h1>
            <p className="text-sm text-on-surface-variant">
              Finding ID: {finding.id} • Created {new Date(finding.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasPermission('edit_findings') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = !isEditing;
                  setIsEditing(next);
                  if (!next && searchParams.get('edit') === 'true') {
                    const params = new URLSearchParams(searchParams);
                    params.delete('edit');
                    setSearchParams(params, { replace: true });
                  }
                }}
                className="border-outline text-on-surface-variant hover:text-primary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {hasPermission('delete_findings') && hasPermission('approve_findings') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={isDeleting}
                className="border-error/30 text-error hover:bg-error/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && !isDeleting ? (
        <div className="mb-6">
          <InlineConfirm
            danger
            title="Delete this finding?"
            description="This action cannot be undone."
            confirmText="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => void handleDelete()}
          />
        </div>
      ) : null}

      <div className="space-y-6">
        <FindingContent
          finding={finding}
          isEditing={isEditing}
          onUpdate={loadFinding}
          onCancelEdit={() => {
            setIsEditing(false);
            if (searchParams.get('edit') === 'true') {
              const params = new URLSearchParams(searchParams);
              params.delete('edit');
              setSearchParams(params, { replace: true });
            }
          }}
        />
      </div>
    </div>
  );
};

export default FindingDetailPage;
