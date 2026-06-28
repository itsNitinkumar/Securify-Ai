import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, ClipboardCheck, ExternalLink, Plus, Sparkles, Trash2, FileText, X, Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { projectApi, CreateProjectData } from '@/api/projectApi';
import { userApi } from '@/api/userApi';
import { findingApi } from '@/api/findingApi';
import { commentThreadApi } from '@/api/commentThreadApi';
import { clientApi, Client } from '@/api/clientApi';
import { templateApi, Template } from '@/api/templateApi';
import { templateKeyFromProject, templateKeyFromTemplate } from '@/reportTemplates/registry';
import { projectTemplateFieldConfig } from '@/reportTemplates/projectFieldsConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import InlineConfirm from '@/components/ui/inline-confirm';
import ImportFindingsDialog from '@/components/findings/ImportFindingsDialog';
import CommentableSection from '@/components/comments/CommentableSection';
import WorkflowPanel from '@/components/projects/WorkflowPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Permissions } from '@/utils/permissions';
import type { User } from '@/types';

type ProjectWithFindings = {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  assigned_reporter_id?: number | null;
  assigned_reporter_name?: string | null;
  assigned_reporter_email?: string | null;
  start_date?: string;
  end_date?: string;
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
  domains?: string[];
  template_id?: number;
  template_name?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  findings: Array<{ id: number; title: string; severity: string; status: string; finding_type?: string; validation_status?: string; created_at: string }>;
};

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [project, setProject] = useState<ProjectWithFindings | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporters, setReporters] = useState<User[]>([]);
  const [loadingReporters, setLoadingReporters] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pendingClientId, setPendingClientId] = useState<number | null>(null);
  const [pendingClientName, setPendingClientName] = useState<string>('');
  const [confirmClientChange, setConfirmClientChange] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [findingIdsWithOpenThreads, setFindingIdsWithOpenThreads] = useState<Set<number>>(new Set());
  const [actionConfirm, setActionConfirm] = useState<'submit' | 'changes' | 'complete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editForm, setEditForm] = useState<CreateProjectData>({
    name: '',
    description: '',
    assigned_reporter_id: undefined,
    start_date: undefined,
    end_date: undefined,
    application_details: [],
    user_roles: [],
    out_of_scope_endpoints: [],
    include_out_of_scope_endpoints: false,
    domains: [],
    template_id: undefined,
  });

  useEffect(() => {
    void load();
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await clientApi.listClients();
        const list = (res as any)?.data || res;
        if (!cancelled) setClients(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setClients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasPermission(Permissions.VIEW_USERS) || !hasPermission(Permissions.ASSIGN_PROJECTS)) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoadingReporters(true);
        const res = await userApi.getReporters();
        const list = (res as any)?.data?.data || (res as any)?.data || [];
        if (!cancelled) setReporters(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Failed to load reporters:', error);
        if (!cancelled) setReporters([]);
      } finally {
        if (!cancelled) setLoadingReporters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasPermission(Permissions.VIEW_TEMPLATES)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await templateApi.getAllTemplates();
        const list = (res as any)?.data?.templates || (res as any)?.data || [];
        if (!cancelled) setTemplates(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Failed to load templates:', error);
        if (!cancelled) setTemplates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projectRes] = await Promise.all([
        projectApi.getProjectWithFindings(Number.parseInt(projectId, 10)),
      ]);
      const loadedProject = (projectRes as any)?.data || projectRes;
      const normalized: ProjectWithFindings = {
        ...(loadedProject as any),
        findings: Array.isArray((loadedProject as any)?.findings) ? (loadedProject as any).findings : [],
      };
      setProject(normalized);

      // Initialize edit state from the loaded project.
      setSelectedClientId(normalized.client_id ?? null);
      setClientQuery(normalized.client_name || '');
      setEditForm({
        name: normalized.name,
        description: normalized.description || '',
        assigned_reporter_id: (normalized as any).assigned_reporter_id ?? undefined,
        start_date: normalized.start_date ? normalized.start_date.split('T')[0] : undefined,
        end_date: normalized.end_date ? normalized.end_date.split('T')[0] : undefined,
        application_details: Array.isArray(normalized.application_details) && normalized.application_details.length
          ? normalized.application_details.map((r) => ({ name: r.name || '', url: r.url || '' }))
          : [],
        user_roles: Array.isArray(normalized.user_roles) && normalized.user_roles.length
          ? normalized.user_roles.map((r) => ({ role: r.role || '', username: r.username || '' }))
          : [],
        out_of_scope_endpoints: Array.isArray(normalized.out_of_scope_endpoints) && normalized.out_of_scope_endpoints.length
          ? normalized.out_of_scope_endpoints.map((r) => ({ name: r.name || '', url: r.url || '' }))
          : [],
        include_out_of_scope_endpoints: Boolean((normalized as any).include_out_of_scope_endpoints),
        domains: Array.isArray((normalized as any).domains) && (normalized as any).domains.length
          ? (normalized as any).domains.map((d: any) => String(d || ''))
          : [],
        template_id: (normalized as any).template_id || undefined,
        template_name: (normalized as any).template_name || undefined,
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const runProjectAction = async (action: 'submit' | 'changes' | 'complete') => {
    if (!project) return;
    try {
      setActionLoading(true);
      if (action === 'submit') await projectApi.submitForReview(project.id);
      else if (action === 'changes') await projectApi.requestChanges(project.id);
      else if (action === 'complete') await projectApi.markComplete(project.id);
      setActionConfirm(null);
      await load();
    } catch (error: any) {
      console.error('Failed to run project action:', error);
      const msg = error?.response?.data?.message || 'Failed to update project status';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const projectActionButton = ({
    label,
    icon,
    className,
    variant,
    action,
    projectId,
    reload,
  }: {
    label: string;
    icon: React.ReactNode;
    className: string;
    variant?: 'outline';
    action: 'submit' | 'changes' | 'complete';
    projectId: number;
    reload: () => void | Promise<void>;
  }) => {
    if (actionConfirm === action) {
      const titles: Record<typeof action, { title: string; desc: string; confirm: string }> = {
        submit: { title: 'Submit for review?', desc: 'Project will move to Pending Review.', confirm: 'Submit' },
        changes: { title: 'Request changes?', desc: 'Project will move to Changes Requested.', confirm: 'Request Changes' },
        complete: { title: 'Mark project complete?', desc: 'This will finalize the project.', confirm: 'Mark Complete' },
      };
      const t = titles[action];
      return (
        <InlineConfirm
          title={t.title}
          description={t.desc}
          confirmText={t.confirm}
          busy={actionLoading}
          onCancel={() => setActionConfirm(null)}
          onConfirm={() => runProjectAction(action)}
        />
      );
    }
    return (
      <Button
        size="sm"
        variant={variant}
        onClick={() => setActionConfirm(action)}
        disabled={actionLoading}
        className={className}
      >
        {icon}
        <span className="hidden xs:inline">{label}</span>
        <span className="xs:hidden">{label.split(' ')[0]}</span>
      </Button>
    );
  };

  const handleDelete = async () => {
    if (!project) return;
    // No browser dialogs. If we need confirmation, add an explicit in-page confirmation step.
    try {
      setDeleting(true);
      await projectApi.deleteProject(project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteFinding = async (findingId: number) => {
    if (!project) return;
    if (!hasPermission(Permissions.DELETE_FINDINGS)) {
      toast.error('You do not have permission to delete findings');
      return;
    }
    try {
      // Optimistically update UI immediately
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.filter((f) => f.id !== findingId),
        };
      });
      
      await findingApi.deleteFinding(findingId);
      toast.success('Finding deleted');
      // Reload to ensure consistency with backend
      await load();
    } catch (error) {
      console.error('Failed to delete finding:', error);
      toast.error('Failed to delete finding');
      // Reload on error to restore correct state
      await load();
    }
  };

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const selectedTemplateForForm = useMemo(() => {
    if (!templates.length) return null;
    const t = templates.find((x) => x.id === editForm.template_id)
      || templates.find((x) => x.id === (project as any)?.template_id);
    return t || null;
  }, [templates, editForm.template_id, project]);

  const formTemplateKey = selectedTemplateForForm
    ? templateKeyFromTemplate(selectedTemplateForForm)
    : templateKeyFromProject(project);

  const updateApplicationRow = (idx: number, patch: Partial<{ name: string; url: string }>) => {
    setEditForm((current) => {
      const rows = (current.application_details || []).slice();
      const prev = rows[idx] || { name: '', url: '' };
      rows[idx] = { ...prev, ...patch };
      return { ...current, application_details: rows };
    });
  };

  const addApplicationRow = () => {
    setEditForm((current) => ({
      ...current,
      application_details: [...(current.application_details || []), { name: '', url: '' }],
    }));
  };

  const removeApplicationRow = (idx: number) => {
    setEditForm((current) => {
      const rows = (current.application_details || []).slice();
      rows.splice(idx, 1);
      return { ...current, application_details: rows };
    });
  };

  const updateUserRoleRow = (idx: number, patch: Partial<{ role: string; username: string }>) => {
    setEditForm((current) => {
      const rows = (current.user_roles || []).slice();
      const prev = rows[idx] || { role: '', username: '' };
      rows[idx] = { ...prev, ...patch };
      return { ...current, user_roles: rows };
    });
  };

  const addUserRoleRow = () => {
    setEditForm((current) => ({
      ...current,
      user_roles: [...(current.user_roles || []), { role: '', username: '' }],
    }));
  };

  const removeUserRoleRow = (idx: number) => {
    setEditForm((current) => {
      const rows = (current.user_roles || []).slice();
      rows.splice(idx, 1);
      return { ...current, user_roles: rows };
    });
  };

  const updateOutOfScopeRow = (idx: number, patch: Partial<{ name: string; url: string }>) => {
    setEditForm((current) => {
      const rows = (current.out_of_scope_endpoints || []).slice();
      const prev = rows[idx] || { name: '', url: '' };
      rows[idx] = { ...prev, ...patch };
      return { ...current, out_of_scope_endpoints: rows };
    });
  };

  const addOutOfScopeRow = () => {
    setEditForm((current) => ({
      ...current,
      out_of_scope_endpoints: [...(current.out_of_scope_endpoints || []), { name: '', url: '' }],
    }));
  };

  const removeOutOfScopeRow = (idx: number) => {
    setEditForm((current) => {
      const rows = (current.out_of_scope_endpoints || []).slice();
      rows.splice(idx, 1);
      return { ...current, out_of_scope_endpoints: rows };
    });
  };

  const updateDomainRow = (idx: number, value: string) => {
    setEditForm((current) => {
      const rows = Array.isArray(current.domains) ? current.domains.slice() : [];
      rows[idx] = value;
      return { ...current, domains: rows };
    });
  };

  const addDomainRow = () => {
    setEditForm((current) => ({
      ...current,
      domains: [...(current.domains || []), ''],
    }));
  };

  const removeDomainRow = (idx: number) => {
    setEditForm((current) => {
      const rows = (current.domains || []).slice();
      rows.splice(idx, 1);
      return { ...current, domains: rows };
    });
  };

  const requestClientChange = (next: { client_id: number | null; client_name: string }) => {
    if (!project) return;
    const currentId = project.client_id ?? null;
    const currentName = project.client_name || '';
    if (next.client_id === currentId && next.client_name === currentName) return;
    setPendingClientId(next.client_id);
    setPendingClientName(next.client_name);
    setConfirmClientChange(true);
  };

  const applyClientChange = () => {
    setConfirmClientChange(false);
    setSelectedClientId(pendingClientId);
    setClientQuery(pendingClientName);
    setPendingClientId(null);
    setPendingClientName('');
  };

  const cancelClientChange = () => {
    setConfirmClientChange(false);
    setPendingClientId(null);
    setPendingClientName('');
  };

  const handleSaveProject = async () => {
    if (!project) return;
    try {
      setSaving(true);

      const selectedTemplate = templates.find((t) => t.id === editForm.template_id) || null;
      const key = selectedTemplate
        ? templateKeyFromTemplate(selectedTemplate)
        : templateKeyFromProject(project);

      const payload: Partial<CreateProjectData> = {};

      // Reporters can only save Category B fields
      if (!isReporter) {
        payload.name = editForm.name;
        payload.assigned_reporter_id = editForm.assigned_reporter_id ?? null;
        payload.start_date = editForm.start_date || null;
        payload.end_date = editForm.end_date || null;
        payload.template_id = editForm.template_id || null;
        payload.template_name = selectedTemplate?.name || editForm.template_name || null;
      }

      payload.description = editForm.description || null;
      payload.client_id = selectedClientId ?? null;
      payload.client_name = !selectedClientId && clientQuery.trim() ? clientQuery.trim() : null;

      const fieldConfig = projectTemplateFieldConfig[key] || projectTemplateFieldConfig.unknown;

      if (fieldConfig.applicationDetails.enabled || fieldConfig.userRoles.enabled || fieldConfig.outOfScopeEndpoints.enabled) {
        payload.application_details = (editForm.application_details || []).filter((r) => (r.name || '').trim() || (r.url || '').trim());
        payload.user_roles = (editForm.user_roles || []).filter((r) => (r.role || '').trim() || (r.username || '').trim());
        payload.include_out_of_scope_endpoints = Boolean(editForm.include_out_of_scope_endpoints);
        payload.out_of_scope_endpoints = payload.include_out_of_scope_endpoints
          ? (editForm.out_of_scope_endpoints || []).filter((r) => (r.name || '').trim() || (r.url || '').trim())
          : [];
      }

      if (fieldConfig.domains.enabled) {
        payload.domains = (editForm.domains || []).map((d) => String(d || '').trim()).filter(Boolean);
      }

      await projectApi.updateProject(project.id, payload);
      toast.success('Project updated');
      setEditing(false);
      await load();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const loadFindingThreads = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await commentThreadApi.getThreads({ projectId: Number(projectId) });
      const data = (res.data as any)?.data || res.data || [];
      const threads = Array.isArray(data) ? data : [];
      const findingIds = new Set(
        threads
          .filter((t: any) => t.finding_id && t.status === 'OPEN')
          .map((t: any) => t.finding_id)
      );
      setFindingIdsWithOpenThreads(findingIds);
    } catch {
      setFindingIdsWithOpenThreads(new Set());
    }
  }, [projectId]);

  // Load thread data after project loads and when comments might change
  useEffect(() => {
    if (project) loadFindingThreads();
  }, [project, loadFindingThreads]);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    pending_comment_resolution: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Pending Review';
      case 'pending_comment_resolution': return 'Changes Requested';
      case 'completed': return 'Completed';
      default: return 'Draft';
    }
  };

  const severityBadge = (severity: string) => {
    if (severity === 'Critical') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (severity === 'High') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (severity === 'Medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (severity === 'Low') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const isCategoryBEmpty = useMemo(() => {
    if (!project) return true;
    return (
      !project.client_name &&
      (!project.application_details || project.application_details.length === 0) &&
      (!project.user_roles || project.user_roles.length === 0) &&
      (!project.out_of_scope_endpoints || project.out_of_scope_endpoints.length === 0) &&
      (!project.domains || project.domains.length === 0)
    );
  }, [project]);

  const isReporter = useMemo(() => {
    return hasPermission('create_findings') && !hasPermission('edit_projects') && !hasPermission('assign_projects') && !!project?.assigned_reporter_id && Number(user?.id) === project.assigned_reporter_id;
  }, [hasPermission, project, user]);

  const canEditCategoryB = isReporter || editing || isCategoryBEmpty;

  const visibleFindings = useMemo(() => {
    if (!project) return [];
    return project.findings;
  }, [project]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="mt-4 text-on-surface-variant">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4 text-on-surface-variant hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card className="p-8 bg-surface-high border-outline">
          <h1 className="text-xl font-semibold text-on-surface">Project not found</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4 text-on-surface-variant hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {project.status ? (
              <Badge className={statusColors[project.status] || statusColors.draft}>
                {getStatusLabel(project.status)}
              </Badge>
            ) : (
              <Badge className={statusColors.draft}>Draft</Badge>
            )}
            {project.client_name ? (
              <Badge variant="outline" className="border-outline text-on-surface-variant">
                {project.client_name}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-on-surface mb-2 truncate">{project.name}</h1>
          <p className="text-xs md:text-sm text-on-surface-variant">
            Created {new Date(project.created_at).toLocaleDateString()} • Updated {new Date(project.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 min-w-0">
          {(hasPermission('create_findings')) ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${project.id}/findings/new`)}
                className="border-outline text-on-surface-variant hover:text-primary text-xs sm:text-sm"
              >
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Add Finding</span>
                <span className="xs:hidden">Add</span>
              </Button>
              {templateKeyFromProject(project) === 'dast' ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/projects/${project.id}/findings/generate?type=true_positive`)}
                    className="bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm"
                  >
                    <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Gen TP</span>
                    <span className="xs:hidden">TP</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/projects/${project.id}/findings/generate?type=false_positive`)}
                    className="bg-purple-500 text-surface hover:bg-purple-500/90 text-xs sm:text-sm"
                  >
                    <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Gen FP</span>
                    <span className="xs:hidden">FP</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => navigate(`/projects/${project.id}/findings/generate`)}
                  className="bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm"
                >
                  <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Generate</span>
                  <span className="xs:hidden">AI</span>
                </Button>
              )}
            </>
          ) : null}
          {(hasPermission('view_reports') || hasRole('client')) ? (
            <>
              <Button
                size="sm"
                onClick={() => navigate(`/projects/${project.id}/report`)}
                className="bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm"
              >
                <ExternalLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{hasRole('client') ? 'Download Report' : 'View Report'}</span>
                <span className="xs:hidden">Report</span>
              </Button>
            </>
          ) : null}
          {(project.status === 'pending_review' && (hasPermission('approve_findings') || hasRole('manager', 'admin'))) ||
           (project.status === 'pending_comment_resolution' && (hasRole('reporter') || hasRole('manager', 'admin'))) ? (
            <Button
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/review`)}
              className="bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm"
            >
              <ClipboardCheck className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 w-4" />
              <span className="hidden xs:inline">
                {project.status === 'pending_comment_resolution' ? 'Continue Review' : 'Review Project'}
              </span>
              <span className="xs:hidden">Review</span>
            </Button>
          ) : null}
          {project.status === 'draft' && (hasRole('reporter') || hasRole('manager', 'admin') || hasPermission('create_findings')) && (
            projectActionButton({
              label: 'Submit For Review',
              icon: <Send className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 w-4" />,
              className: 'bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm',
              action: 'submit',
              projectId: project.id,
              reload: load,
            })
          )}
          {project.status === 'pending_comment_resolution' && (hasRole('reporter') || hasRole('manager', 'admin')) && (
            projectActionButton({
              label: 'Re-submit For Review',
              icon: <Send className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 w-4" />,
              className: 'bg-primary text-surface hover:bg-primary/90 text-xs sm:text-sm',
              action: 'submit',
              projectId: project.id,
              reload: load,
            })
          )}

          {(hasPermission('create_findings')) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
              className="border-outline text-on-surface-variant hover:text-primary text-xs sm:text-sm"
            >
              <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Import Findings</span>
              <span className="xs:hidden">Import</span>
            </Button>
          )}
        </div>
      </div>

      {(() => {
        const canEdit = hasRole('manager') || hasRole('admin') || hasPermission('edit_projects') || (hasPermission('create_findings') && (project as any).assigned_reporter_id && Number(user?.id) === (project as any).assigned_reporter_id);
        return canEdit ? (
        <Card className="mb-6 p-3 sm:p-4 bg-surface-high border-outline">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Project Details</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Edit project/client/scope metadata used in reports.</p>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    // Reset to last loaded values.
                    if (project) {
                      setSelectedClientId(project.client_id ?? null);
                      setClientQuery(project.client_name || '');
                      setEditForm({
                        name: project.name,
                        description: project.description || '',
                        assigned_reporter_id: (project as any).assigned_reporter_id ?? undefined,
                        start_date: project.start_date ? project.start_date.split('T')[0] : undefined,
                        end_date: project.end_date ? project.end_date.split('T')[0] : undefined,
                        application_details: Array.isArray(project.application_details) && project.application_details.length
                          ? project.application_details.map((r) => ({ name: r.name || '', url: r.url || '' }))
                          : [],
                        user_roles: Array.isArray(project.user_roles) && project.user_roles.length
                          ? project.user_roles.map((r) => ({ role: r.role || '', username: r.username || '' }))
                          : [],
                        out_of_scope_endpoints: Array.isArray(project.out_of_scope_endpoints) && project.out_of_scope_endpoints.length
                          ? project.out_of_scope_endpoints.map((r) => ({ name: r.name || '', url: r.url || '' }))
                          : [],
                        include_out_of_scope_endpoints: Boolean((project as any).include_out_of_scope_endpoints),
                        domains: Array.isArray((project as any).domains) && (project as any).domains.length
                          ? (project as any).domains.map((d: any) => String(d || ''))
                          : [],
                        template_id: (project as any).template_id || undefined,
                      });
                    }
                  }}
                  className="border-outline text-on-surface-variant"
                >
                  Cancel
                </Button>
              ) : !isReporter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="border-outline text-on-surface-variant hover:text-primary text-xs sm:text-sm"
                >
                  Edit Project
                </Button>
              ) : null}
            </div>
          </div>

          {/* Category A: Creation fields - read-only or edit mode */}
          {editing ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Project Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                  className="bg-surface border-outline text-on-surface"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={editForm.start_date || ''}
                    onChange={(e) => setEditForm((c) => ({ ...c, start_date: e.target.value || undefined }))}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={editForm.end_date || ''}
                    onChange={(e) => setEditForm((c) => ({ ...c, end_date: e.target.value || undefined }))}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Report Template</label>
                <select
                  value={editForm.template_id || ''}
                  onChange={(e) => setEditForm((c) => ({ ...c, template_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {hasPermission('assign_projects') && (
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">Assigned Reporter</label>
                  {loadingReporters ? (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading reporters...
                    </div>
                  ) : (
                    <select
                      value={editForm.assigned_reporter_id ?? ''}
                      onChange={(e) => setEditForm((c) => ({ ...c, assigned_reporter_id: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">No reporter assigned</option>
                      {reporters.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                <div className="text-xs text-on-surface-variant mb-1">Project Name</div>
                <div className="text-sm text-on-surface">{project.name}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                <div className="text-xs text-on-surface-variant mb-1">Report Template</div>
                <div className="text-sm text-on-surface">{project.template_name || '-'}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                <div className="text-xs text-on-surface-variant mb-1">Assessment Window</div>
                <div className="text-sm text-on-surface">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'Not set'} to {project.end_date ? new Date(project.end_date).toLocaleDateString('en-GB') : 'Not set'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                <div className="text-xs text-on-surface-variant mb-1">Assigned Reporter</div>
                <div className="text-sm text-on-surface">
                  {(() => {
                    const rid = (project as any).assigned_reporter_id;
                    if (!rid) return '(Not assigned)';
                    const fromList = reporters.find((r) => r.id === rid);
                    if (fromList) return `${fromList.name} (${fromList.email})`;
                    if (user?.id && Number(user.id) === rid) return `${user?.name || 'You'} (${user?.email || ''})`;
                    const fromProject = (project as any).assigned_reporter_name;
                    const fromEmail = (project as any).assigned_reporter_email;
                    if (fromProject) return `${fromProject} (${fromEmail || ''})`;
                    return `Reporter #${rid}`;
                  })()}
                </div>
              </div>
            </div>
          )}

          <hr className="border-outline-variant my-4" />

          {/* Category B: Metadata fields */}
          {canEditCategoryB ? (
            <div className="space-y-4">
              {/* Client Name - always visible, always editable */}
              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Client Name</label>
                {confirmClientChange ? (
                  <InlineConfirm
                    title="Do you want to change the client?"
                    description={`Current: ${project.client_name || 'None'} New: ${pendingClientName || 'None'}`}
                    confirmText="Yes, change"
                    cancelText="No"
                    onConfirm={applyClientChange}
                    onCancel={cancelClientChange}
                    danger
                  />
                ) : null}

                <Input
                  value={clientQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClientQuery(v);
                    setSelectedClientId(null);
                  }}
                  placeholder="Type to search or add a new client"
                  className="bg-surface border-outline text-on-surface"
                />
                <div className="mt-2 max-h-44 overflow-auto rounded-md border border-outline-variant bg-surface">
                  {filteredClients.length ? (
                    <div className="divide-y divide-outline-variant">
                      {filteredClients.slice(0, 50).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => requestClientChange({ client_id: c.id, client_name: c.name })}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-high ${selectedClientId === c.id ? 'bg-surface-high text-primary' : 'text-on-surface'}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-on-surface-variant">No clients found</div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const name = clientQuery.trim();
                      if (!name) return;
                      try {
                        const res = await clientApi.createClient(name);
                        const created = ((res as any)?.data || res) as Client;
                        setClients((current) => {
                          const exists = current.some((x) => x.id === created.id || x.name.toLowerCase() === created.name.toLowerCase());
                          const next = exists ? current : [...current, created];
                          return next.slice().sort((a, b) => a.name.localeCompare(b.name));
                        });
                        requestClientChange({ client_id: created.id, client_name: created.name });
                        toast.success('Client added');
                      } catch (error) {
                        console.error('Failed to add client:', error);
                        toast.error('Failed to add client');
                      }
                    }}
                    className="border-outline text-on-surface-variant"
                  >
                    Add Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestClientChange({ client_id: null, client_name: '' })}
                    className="border-outline text-on-surface-variant"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {(() => {
                const fieldConfig = projectTemplateFieldConfig[formTemplateKey] || projectTemplateFieldConfig.unknown;
                return (
                  <>
                    {fieldConfig.applicationDetails.enabled && (
                      <div>
                        <label className="text-sm font-medium text-on-surface mb-2 block">{fieldConfig.applicationDetails.label}</label>
                        {editForm.application_details && editForm.application_details.length > 0 ? (
                          <div className="overflow-auto rounded-md border border-outline-variant">
                            <table className="w-full text-sm">
                              <thead className="bg-surface">
                                <tr className="text-left">
                                  <th className="px-3 py-2 text-on-surface">Name</th>
                                  <th className="px-3 py-2 text-on-surface">URL</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant bg-surface-high">
                                {(editForm.application_details || []).map((row, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={row.name}
                                        onChange={(e) => updateApplicationRow(idx, { name: e.target.value })}
                                        className="bg-surface border-outline text-on-surface"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={row.url}
                                        onChange={(e) => updateApplicationRow(idx, { url: e.target.value })}
                                        className="bg-surface border-outline text-on-surface"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button type="button" variant="outline" onClick={() => removeApplicationRow(idx)} className="border-outline text-on-surface-variant">
                                        Remove
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant py-2">No rows added yet.</p>
                        )}
                        <div className="pt-2">
                          <Button type="button" variant="outline" onClick={addApplicationRow} className="border-outline text-on-surface-variant">
                            Add Row
                          </Button>
                        </div>
                      </div>
                    )}

                    {fieldConfig.userRoles.enabled && (
                      <div>
                        <label className="text-sm font-medium text-on-surface mb-2 block">{fieldConfig.userRoles.label}</label>
                        {editForm.user_roles && editForm.user_roles.length > 0 ? (
                          <div className="overflow-auto rounded-md border border-outline-variant">
                            <table className="w-full text-sm">
                              <thead className="bg-surface">
                                <tr className="text-left">
                                  <th className="px-3 py-2 text-on-surface">Role</th>
                                  <th className="px-3 py-2 text-on-surface">Username/Email</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant bg-surface-high">
                                {(editForm.user_roles || []).map((row, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={row.role}
                                        onChange={(e) => updateUserRoleRow(idx, { role: e.target.value })}
                                        className="bg-surface border-outline text-on-surface"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={row.username}
                                        onChange={(e) => updateUserRoleRow(idx, { username: e.target.value })}
                                        className="bg-surface border-outline text-on-surface"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button type="button" variant="outline" onClick={() => removeUserRoleRow(idx)} className="border-outline text-on-surface-variant">
                                        Remove
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant py-2">No rows added yet.</p>
                        )}
                        <div className="pt-2">
                          <Button type="button" variant="outline" onClick={addUserRoleRow} className="border-outline text-on-surface-variant">
                            Add Row
                          </Button>
                        </div>
                      </div>
                    )}

                    {fieldConfig.outOfScopeEndpoints.enabled && (
                      <div>
                        <label className="text-sm font-medium text-on-surface mb-2 block">{fieldConfig.outOfScopeEndpoints.label}</label>
                        <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                          <input
                            type="checkbox"
                            checked={Boolean(editForm.include_out_of_scope_endpoints)}
                            onChange={(e) => setEditForm((c) => ({ ...c, include_out_of_scope_endpoints: e.target.checked }))}
                          />
                          Include Out of Scope Endpoints
                        </label>

                        {editForm.include_out_of_scope_endpoints ? (
                          <>
                            {editForm.out_of_scope_endpoints && editForm.out_of_scope_endpoints.length > 0 ? (
                              <div className="overflow-auto rounded-md border border-outline-variant">
                                <table className="w-full text-sm">
                                  <thead className="bg-surface">
                                    <tr className="text-left">
                                      <th className="px-3 py-2 text-on-surface">Name</th>
                                      <th className="px-3 py-2 text-on-surface">URL</th>
                                      <th className="px-3 py-2" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant bg-surface-high">
                                    {(editForm.out_of_scope_endpoints || []).map((row, idx) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2">
                                          <Input
                                            value={row.name}
                                            onChange={(e) => updateOutOfScopeRow(idx, { name: e.target.value })}
                                            className="bg-surface border-outline text-on-surface"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <Input
                                            value={row.url}
                                            onChange={(e) => updateOutOfScopeRow(idx, { url: e.target.value })}
                                            className="bg-surface border-outline text-on-surface"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <Button type="button" variant="outline" onClick={() => removeOutOfScopeRow(idx)} className="border-outline text-on-surface-variant">
                                            Remove
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-on-surface-variant py-2">No rows added yet.</p>
                            )}
                            <div className="pt-2">
                              <Button type="button" variant="outline" onClick={addOutOfScopeRow} className="border-outline text-on-surface-variant">
                                Add Row
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-on-surface-variant py-2">No rows added yet.</p>
                        )}
                      </div>
                    )}

                    {fieldConfig.domains.enabled && (
                      <div>
                        <label className="text-sm font-medium text-on-surface mb-2 block">{fieldConfig.domains.label}</label>
                        {editForm.domains && editForm.domains.length > 0 ? (
                          <div className="overflow-auto rounded-md border border-outline-variant">
                            <table className="w-full text-sm">
                              <thead className="bg-surface">
                                <tr className="text-left">
                                  <th className="px-3 py-2 text-on-surface">Domain</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant bg-surface-high">
                                {(editForm.domains || []).map((d, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2">
                                      <Input
                                        value={d}
                                        onChange={(e) => updateDomainRow(idx, e.target.value)}
                                        placeholder="https://example.com"
                                        className="bg-surface border-outline text-on-surface"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <Button type="button" variant="outline" onClick={() => removeDomainRow(idx)} className="border-outline text-on-surface-variant">
                                        Remove
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant py-2">No domains added yet.</p>
                        )}
                        <div className="pt-2">
                          <Button type="button" variant="outline" onClick={addDomainRow} className="border-outline text-on-surface-variant">
                            Add Row
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                <div className="text-xs text-on-surface-variant mb-1">Client Name</div>
                <div className="text-sm text-on-surface">
                  {project.client_name || 'Not configured'}
                </div>
              </div>

              <CommentableSection
                projectId={project.id}
                sectionType="project"
                sectionKey="description"
                label="Description"
                className="p-3 rounded-lg bg-surface border border-outline-variant"
              >
                <div className="text-sm text-on-surface whitespace-pre-wrap">
                  {project.description || 'No description provided.'}
                </div>
              </CommentableSection>

              {(() => {
                const vc = projectTemplateFieldConfig[formTemplateKey] || projectTemplateFieldConfig.unknown;
                return (
                  <>
                    {vc.applicationDetails.enabled && (
                      <CommentableSection
                        projectId={project.id}
                        sectionType="project"
                        sectionKey="application_details"
                        label={vc.applicationDetails.label}
                        className="p-3 rounded-lg bg-surface border border-outline-variant"
                      >
                        {project.application_details && project.application_details.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-high">
                                <tr>
                                  <th className="px-3 py-2 text-left text-on-surface">Name</th>
                                  <th className="px-3 py-2 text-left text-on-surface">URL</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant">
                                {project.application_details.map((app, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-on-surface">{app.name}</td>
                                    <td className="px-3 py-2 text-on-surface">{app.url}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant">No rows added yet.</p>
                        )}
                      </CommentableSection>
                    )}

                    {vc.userRoles.enabled && (
                      <CommentableSection
                        projectId={project.id}
                        sectionType="project"
                        sectionKey="user_roles"
                        label={vc.userRoles.label}
                        className="p-3 rounded-lg bg-surface border border-outline-variant"
                      >
                        {project.user_roles && project.user_roles.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-high">
                                <tr>
                                  <th className="px-3 py-2 text-left text-on-surface">Role</th>
                                  <th className="px-3 py-2 text-left text-on-surface">Username/Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant">
                                {project.user_roles.map((role, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-on-surface">{role.role}</td>
                                    <td className="px-3 py-2 text-on-surface">{role.username}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant">No rows added yet.</p>
                        )}
                      </CommentableSection>
                    )}

                    {vc.outOfScopeEndpoints.enabled && project.include_out_of_scope_endpoints && (
                      <CommentableSection
                        projectId={project.id}
                        sectionType="project"
                        sectionKey="out_of_scope_endpoints"
                        label={vc.outOfScopeEndpoints.label}
                        className="p-3 rounded-lg bg-surface border border-outline-variant"
                      >
                        {project.out_of_scope_endpoints && project.out_of_scope_endpoints.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-high">
                                <tr>
                                  <th className="px-3 py-2 text-left text-on-surface">Name</th>
                                  <th className="px-3 py-2 text-left text-on-surface">URL</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant">
                                {project.out_of_scope_endpoints.map((endpoint, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-on-surface">{endpoint.name}</td>
                                    <td className="px-3 py-2 text-on-surface">{endpoint.url}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant">No rows added yet.</p>
                        )}
                      </CommentableSection>
                    )}

                    {vc.domains.enabled && (
                      <CommentableSection
                        projectId={project.id}
                        sectionType="project"
                        sectionKey="domains"
                        label={vc.domains.label}
                        className="p-3 rounded-lg bg-surface border border-outline-variant"
                      >
                        {project.domains && project.domains.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-surface-high">
                                <tr>
                                  <th className="px-3 py-2 text-left text-on-surface">Domain</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant">
                                {project.domains.map((d, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-on-surface">{d}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant">No domains added yet.</p>
                        )}
                      </CommentableSection>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={handleSaveProject}
              disabled={saving}
              className="w-full sm:w-auto bg-primary text-surface hover:bg-primary/90"
            >
              {saving ? 'Saving...' : 'Save Project Details'}
            </Button>
          </div>
        </Card>
      ) : null;
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {templateKeyFromProject(project) === 'dast' ? (
            <>
              {/* DAST: True Positive Findings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-on-surface">True Positive Findings</h2>
                  <span className="text-xs text-on-surface-variant">{visibleFindings.filter((f: any) => f.finding_type !== 'false_positive').length} total</span>
                </div>
                {visibleFindings.filter((f: any) => f.finding_type !== 'false_positive').length > 0 ? (
                  <div className="space-y-2">
                    {visibleFindings.filter((f: any) => f.finding_type !== 'false_positive').slice(0, 10).map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        severityBadge={severityBadge}
                        onNavigate={() => navigate(`/findings/${finding.id}`)}
                        onDelete={() => handleDeleteFinding(finding.id)}
                        showDelete={hasPermission('delete_findings')}
                        hasOpenComments={findingIdsWithOpenThreads.has(finding.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center bg-surface-high border-outline">
                    <p className="text-sm text-on-surface-variant">No true positive findings</p>
                  </Card>
                )}
              </div>

              {/* DAST: False Positive Findings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-on-surface">False Positive Findings</h2>
                  <span className="text-xs text-on-surface-variant">{visibleFindings.filter((f: any) => f.finding_type === 'false_positive').length} total</span>
                </div>
                {visibleFindings.filter((f: any) => f.finding_type === 'false_positive').length > 0 ? (
                  <div className="space-y-2">
                    {visibleFindings.filter((f: any) => f.finding_type === 'false_positive').slice(0, 10).map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        severityBadge={severityBadge}
                        onNavigate={() => navigate(`/findings/${finding.id}`)}
                        onDelete={() => handleDeleteFinding(finding.id)}
                        showDelete={hasPermission('delete_findings')}
                        isFP
                        hasOpenComments={findingIdsWithOpenThreads.has(finding.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center bg-surface-high border-outline">
                    <p className="text-sm text-on-surface-variant">No false positive findings</p>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-on-surface">Recent Findings</h2>
                <span className="text-xs text-on-surface-variant">{visibleFindings.length} total</span>
              </div>

              {visibleFindings.length > 0 ? (
                <div className="space-y-2">
                  {visibleFindings.slice(0, 10).map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      severityBadge={severityBadge}
                      onNavigate={() => navigate(`/findings/${finding.id}`)}
                      onDelete={() => handleDeleteFinding(finding.id)}
                      showDelete={hasPermission('delete_findings')}
                      hasOpenComments={findingIdsWithOpenThreads.has(finding.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center bg-surface-high border-outline">
                  <CheckCircle className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-on-surface-variant">No findings yet</p>
                </Card>
              )}
            </>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4 min-w-0">
          <Card className="p-3 sm:p-4 bg-surface-high border-outline">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-error" />
                  <span className="text-[10px] sm:text-xs text-on-surface-variant">High Priority</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-on-surface font-technical">
                  {project.findings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length}
                </div>
              </div>
              <div className="p-2 sm:p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-[10px] sm:text-xs text-on-surface-variant">Total Findings</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-on-surface font-technical">
                  {project.findings.length}
                </div>
              </div>
            </div>
          </Card>

          <WorkflowPanel
            projectId={project.id}
            status={project.status || 'draft'}
            onStatusChange={load}
          />
        </div>
      </div>

      <ImportFindingsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        currentProjectId={project.id}
        onImportComplete={() => load()}
      />
    </div>
  );
};

const FindingCard = ({ finding, severityBadge, onNavigate, onDelete, showDelete, isFP, hasOpenComments }: {
  finding: any;
  severityBadge: (s: string) => string;
  onNavigate: () => void;
  onDelete: () => void;
  showDelete: boolean;
  isFP?: boolean;
  hasOpenComments?: boolean;
}) => (
  <Card
    className={`p-3 bg-surface-high border-outline-variant hover:border-primary/30 transition-all cursor-pointer ${hasOpenComments ? 'ring-2 ring-orange-500/50 border-orange-500/30' : ''}`}
    onClick={onNavigate}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-on-surface line-clamp-1">{finding.title}</h4>
          {!isFP && <Badge className={`text-xs ${severityBadge(finding.severity)}`}>{finding.severity}</Badge>}
          {(isFP || finding.finding_type === 'false_positive') && (
            <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">FP</Badge>
          )}
          {hasOpenComments && (
            <Badge className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
              <MessageSquare className="w-3 h-3 mr-0.5 inline" />
              Comments
            </Badge>
          )}
        </div>
        <p className="text-xs text-on-surface-variant">Created {new Date(finding.created_at).toLocaleDateString()}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0 text-primary hover:text-primary/80"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-error hover:text-error/80"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this finding?')) {
              onDelete();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  </Card>
);

export default ProjectDetailPage;
