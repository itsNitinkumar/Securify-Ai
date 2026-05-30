import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  History,
} from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FindingContent from '@/components/findings/FindingContent';
import FindingWorkflowButtons from '@/components/findings/FindingWorkflowButtons';
import ApprovalWorkflow from '@/components/findings/ApprovalWorkflow';
import VersionHistory from '@/components/findings/VersionHistory';
import InlineConfirm from '@/components/ui/inline-confirm';
import { toast } from 'react-hot-toast';

const FindingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastKnownProjectId, setLastKnownProjectId] = useState<number | null>(null);
  const currentUserId = parseInt(user?.id || '0');

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
    if (isDeleting) return; // Don't reload if deleting
    try {
      setLoading(true);
      const response = await findingApi.getFinding(parseInt(id!));
      const findingData = (response.data as any)?.data || response.data;
      setFinding(findingData);
      // Store project_id for later use
      if (findingData?.project_id) {
        setLastKnownProjectId(findingData.project_id);
      }
    } catch (error: any) {
      console.error('Failed to load finding:', error);

      // If finding not found (404), silently redirect to project page or dashboard
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
    if (isDeleting || !finding) return; // Prevent double-clicks and ensure finding is loaded

    setIsDeleting(true);
    setConfirmDelete(false);

    // Get project_id from finding
    const projectId = finding.project_id;

    // Determine where to navigate
    const navigateTo = projectId
      ? `/projects/${projectId}`
      : '/dashboard';

    // Navigate IMMEDIATELY
    navigate(navigateTo, { replace: true });
    toast.success('Finding deleted');

    // Delete in background
    try {
      await findingApi.deleteFinding(parseInt(id!));
    } catch (error) {
      console.error('Failed to delete finding:', error);
    }
  };

  const handleRegenerateSection = async (section: string) => {
    try {
      await findingApi.regenerateSection(parseInt(id!), section);
      loadFinding();
    } catch (error) {
      console.error('Failed to regenerate section:', error);
      toast.error('Failed to regenerate section');
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

  // If finding is null and not loading, we've already redirected in useEffect
  // This should never render, but just in case:
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

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    changes_requested: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const handleBack = () => {
    if (finding?.project_id) {
      navigate(`/projects/${finding.project_id}`);
    } else {
      navigate('/projects'); // Go to projects list
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
              <Badge className={statusColors[finding.status]}>
                {finding.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {finding.owasp_category && (
                <Badge variant="outline" className="border-outline text-on-surface-variant">
                  {finding.owasp_category}
                </Badge>
              )}
              {finding.cwe_id && (
                <Badge variant="outline" className="border-outline text-on-surface-variant">
                  {finding.cwe_id}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
              {finding.title}
            </h1>
            <p className="text-sm text-on-surface-variant">
              Finding ID: {finding.id} • Created {new Date(finding.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVersions(!showVersions)}
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <History className="w-4 h-4 mr-2" />
              Versions
            </Button>
            {hasPermission('edit_findings') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Buttons */}
          <FindingWorkflowButtons
            finding={finding}
            currentUserId={currentUserId}
            onUpdate={loadFinding}
            onEditClick={() => setIsEditing(!isEditing)}
          />

          {/* Content Sections */}
          <FindingContent
            finding={finding}
            isEditing={isEditing}
            onUpdate={loadFinding}
            onRegenerateSection={handleRegenerateSection}
            onCancelEdit={() => setIsEditing(false)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          <ApprovalWorkflow finding={finding} />

          {/* Version History */}
       {showVersions && (
         <VersionHistory findingId={finding.id} />
       )}
     </div>
     
     {/* Comments Section */}
     <div className="lg:col-span-1 space-y-6">
       <FindingComments 
         findingId={finding.id} 
         currentUserId={currentUserId} 
       />
     </div>
   </div>
 </div>
  );
};

export default FindingDetailPage;
