import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  XCircle,
  History,
} from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadFinding();
      loadCurrentUser();
    }
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const response = await authApi.getProfile();
      const userData = (response.data as any)?.data || (response.data as any)?.user || response.data;
      setCurrentUserRole(userData?.role || '');
      setCurrentUserId(userData?.id || 0);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadFinding = async () => {
    try {
      setLoading(true);
      const response = await findingApi.getFinding(parseInt(id!));
      const findingData = (response.data as any)?.data || response.data;
      setFinding(findingData);
    } catch (error) {
      console.error('Failed to load finding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await findingApi.deleteFinding(parseInt(id!));
      navigate('/findings');
    } catch (error) {
      console.error('Failed to delete finding:', error);
      toast.error('Failed to delete finding');
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

  if (!finding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Card className="p-12 text-center bg-surface-high border-outline">
          <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">Finding not found</h3>
          <Button onClick={() => navigate('/findings')} className="mt-4">
            Back to Findings
          </Button>
        </Card>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="border-error/30 text-error hover:bg-error/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {confirmDelete ? (
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
            currentUserRole={currentUserRole}
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
      </div>
    </div>
  );
};

export default FindingDetailPage;
