import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, ExternalLink, Plus, Sparkles, Trash2, FileText, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authApi } from '@/api/authApi';
import { projectApi, CreateProjectData } from '@/api/projectApi';
import { findingApi } from '@/api/findingApi';
import { clientApi, Client } from '@/api/clientApi';
import { templateApi, Template } from '@/api/templateApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import InlineConfirm from '@/components/ui/inline-confirm';
import ImportFindingsDialog from '@/components/findings/ImportFindingsDialog';

type ProjectWithFindings = {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  start_date?: string;
  end_date?: string;
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
  template_id?: number;
  template_name?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  findings: Array<{ id: number; title: string; severity: string; status: string; created_at: string }>;
};

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [project, setProject] = useState<ProjectWithFindings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pendingClientId, setPendingClientId] = useState<number | null>(null);
  const [pendingClientName, setPendingClientName] = useState<string>('');
  const [confirmClientChange, setConfirmClientChange] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<CreateProjectData>({
    name: '',
    description: '',
    start_date: undefined,
    end_date: undefined,
    application_details: [{ name: '', url: '' }],
    user_roles: [{ role: '', username: '' }],
    out_of_scope_endpoints: [{ name: '', url: '' }],
    include_out_of_scope_endpoints: false,
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
      } catch (error) {
        console.error('Failed to load clients:', error);
        if (!cancelled) setClients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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
      const [projectRes, profileRes] = await Promise.all([
        projectApi.getProjectWithFindings(Number.parseInt(projectId, 10)),
        authApi.getProfile(),
      ]);
      const loadedProject = (projectRes as any)?.data || projectRes;
      const userData = (profileRes.data as any)?.data || (profileRes.data as any)?.user || profileRes.data;
      setCurrentUserRole(userData?.role || '');
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
        start_date: normalized.start_date ? normalized.start_date.split('T')[0] : undefined,
        end_date: normalized.end_date ? normalized.end_date.split('T')[0] : undefined,
        application_details: Array.isArray(normalized.application_details) && normalized.application_details.length
          ? normalized.application_details.map((r) => ({ name: r.name || '', url: r.url || '' }))
          : [{ name: '', url: '' }],
        user_roles: Array.isArray(normalized.user_roles) && normalized.user_roles.length
          ? normalized.user_roles.map((r) => ({ role: r.role || '', username: r.username || '' }))
          : [{ role: '', username: '' }],
        out_of_scope_endpoints: Array.isArray(normalized.out_of_scope_endpoints) && normalized.out_of_scope_endpoints.length
          ? normalized.out_of_scope_endpoints.map((r) => ({ name: r.name || '', url: r.url || '' }))
          : [{ name: '', url: '' }],
        include_out_of_scope_endpoints: Boolean((normalized as any).include_out_of_scope_endpoints),
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
      return { ...current, application_details: rows.length ? rows : [{ name: '', url: '' }] };
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
      return { ...current, user_roles: rows.length ? rows : [{ role: '', username: '' }] };
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
      return { ...current, out_of_scope_endpoints: rows.length ? rows : [{ name: '', url: '' }] };
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
      const payload: Partial<CreateProjectData> = {
        name: editForm.name,
        description: editForm.description || undefined,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        application_details: (editForm.application_details || []).filter((r) => (r.name || '').trim() || (r.url || '').trim()),
        user_roles: (editForm.user_roles || []).filter((r) => (r.role || '').trim() || (r.username || '').trim()),
        out_of_scope_endpoints: editForm.include_out_of_scope_endpoints
          ? (editForm.out_of_scope_endpoints || []).filter((r) => (r.name || '').trim() || (r.url || '').trim())
          : [],
        include_out_of_scope_endpoints: Boolean(editForm.include_out_of_scope_endpoints),
        template_id: editForm.template_id || undefined,
        client_id: selectedClientId || undefined,
        client_name: !selectedClientId && clientQuery.trim() ? clientQuery.trim() : undefined,
      };

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

  const statusColors = {
    active: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  const severityBadge = (severity: string) => {
    if (severity === 'Critical') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (severity === 'High') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (severity === 'Medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (severity === 'Low') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const visibleFindings = useMemo(() => {
    if (!project) return [];
    if (currentUserRole === 'client') {
      return project.findings.filter((finding) => finding.status === 'approved');
    }
    return project.findings;
  }, [project, currentUserRole]);

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
              <Badge className={statusColors[project.status as keyof typeof statusColors] || statusColors.pending}>
                {project.status.toUpperCase()}
              </Badge>
            ) : null}
            {project.client_name ? (
              <Badge variant="outline" className="border-outline text-on-surface-variant">
                {project.client_name}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 truncate">{project.name}</h1>
          <p className="text-sm text-on-surface-variant">
            Created {new Date(project.created_at).toLocaleDateString()} • Updated {new Date(project.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(currentUserRole === 'analyst' || currentUserRole === 'manager') ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${project.id}/findings/new`)}
                className="border-outline text-on-surface-variant hover:text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Finding
              </Button>
              <Button
                onClick={() => navigate(`/projects/${project.id}/findings/generate`)}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </>
          ) : null}
          {(currentUserRole === 'manager' || currentUserRole === 'client') ? (
            <>
              <Button
                onClick={() => navigate(`/projects/${project.id}/report`)}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {currentUserRole === 'client' ? 'Download Report' : 'View Full Report'}
              </Button>
            </>
          ) : null}
          {(currentUserRole === 'analyst' || currentUserRole === 'manager') && (
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <FileText className="mr-2 h-4 w-4" />
              Import Findings
            </Button>
          )}
        </div>
      </div>

      {currentUserRole === 'manager' ? (
        <Card className="mb-6 p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Project Details</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Managers can edit project/client/scope metadata used in reports.</p>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      // Reset to last loaded values.
                      if (project) {
                        setSelectedClientId(project.client_id ?? null);
                        setClientQuery(project.client_name || '');
                        setEditForm({
                          name: project.name,
                          description: project.description || '',
                          start_date: project.start_date ? project.start_date.split('T')[0] : undefined,
                          end_date: project.end_date ? project.end_date.split('T')[0] : undefined,
                          application_details: Array.isArray(project.application_details) && project.application_details.length
                            ? project.application_details.map((r) => ({ name: r.name || '', url: r.url || '' }))
                            : [{ name: '', url: '' }],
                          user_roles: Array.isArray(project.user_roles) && project.user_roles.length
                            ? project.user_roles.map((r) => ({ role: r.role || '', username: r.username || '' }))
                            : [{ role: '', username: '' }],
                          out_of_scope_endpoints: Array.isArray(project.out_of_scope_endpoints) && project.out_of_scope_endpoints.length
                            ? project.out_of_scope_endpoints.map((r) => ({ name: r.name || '', url: r.url || '' }))
                            : [{ name: '', url: '' }],
                          include_out_of_scope_endpoints: Boolean((project as any).include_out_of_scope_endpoints),
                          template_id: (project as any).template_id || undefined,
                        });
                      }
                    }}
                    className="border-outline text-on-surface-variant"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={saving}
                    className="bg-primary text-surface hover:bg-primary/90"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="border-outline text-on-surface-variant hover:text-primary"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={saving}
                    className="bg-primary text-surface hover:bg-primary/90"
                  >
                    {saving ? 'Saving...' : 'Save Details'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {editing || (!project.description && !project.start_date && (!project.application_details || project.application_details.length === 0) && (!project.user_roles || project.user_roles.length === 0)) ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Project Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                  className="bg-surface border-outline text-on-surface"
                />
              </div>

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
                    onChange={(e) => editing && setEditForm((c) => ({ ...c, template_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary ${!editing ? 'bg-surface-high border-outline-variant cursor-not-allowed opacity-60' : 'bg-surface border-outline'}`}
                  >
                    <option value="">Select a template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Application Details</label>
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
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeApplicationRow(idx)}
                              className="border-outline text-on-surface-variant"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pt-2">
                  <Button type="button" variant="outline" onClick={addApplicationRow} className="border-outline text-on-surface-variant">
                    Add Row
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">User Role</label>
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
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeUserRoleRow(idx)}
                              className="border-outline text-on-surface-variant"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pt-2">
                  <Button type="button" variant="outline" onClick={addUserRoleRow} className="border-outline text-on-surface-variant">
                    Add Row
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Out of Scope Endpoints</label>
                <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.include_out_of_scope_endpoints)}
                    onChange={(e) => setEditForm((c) => ({ ...c, include_out_of_scope_endpoints: e.target.checked }))}
                  />
                  Include Out of Scope Endpoints
                </label>

                {editForm.include_out_of_scope_endpoints ? (
                  <>
                    <div className="mt-3 overflow-auto rounded-md border border-outline-variant">
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => removeOutOfScopeRow(idx)}
                                  className="border-outline text-on-surface-variant"
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pt-2">
                      <Button type="button" variant="outline" onClick={addOutOfScopeRow} className="border-outline text-on-surface-variant">
                        Add Row
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {project.template_name && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-1">Report Template</div>
                  <div className="text-sm text-on-surface">{project.template_name}</div>
                </div>
              )}

              {project.description && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-1">Description</div>
                  <div className="text-sm text-on-surface whitespace-pre-wrap">{project.description}</div>
                </div>
              )}

              {project.application_details && project.application_details.length > 0 && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-2">Application Details</div>
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
                </div>
              )}

              {project.user_roles && project.user_roles.length > 0 && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-2">User Roles</div>
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
                </div>
              )}

              {(project.start_date || project.end_date) && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-1">Assessment Window</div>
                  <div className="text-sm text-on-surface">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'Not set'} to {project.end_date ? new Date(project.end_date).toLocaleDateString('en-GB') : 'Not set'}
                  </div>
                </div>
              )}

              {(project as any).include_out_of_scope_endpoints && project.out_of_scope_endpoints && project.out_of_scope_endpoints.length > 0 && (
                <div className="p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="text-xs text-on-surface-variant mb-2">Out of Scope Endpoints</div>
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
                </div>
              )}
            </div>
          )}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface">Recent Findings</h2>
            <span className="text-xs text-on-surface-variant">{visibleFindings.length} total</span>
          </div>

          {visibleFindings.length > 0 ? (
            <div className="space-y-2">
              {visibleFindings.slice(0, 10).map((finding) => (
                <Card
                  key={finding.id}
                  className="p-3 bg-surface-high border-outline-variant hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/findings/${finding.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-on-surface line-clamp-1">{finding.title}</h4>
                        <Badge className={`text-xs ${severityBadge(finding.severity)}`}>{finding.severity}</Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant">Created {new Date(finding.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-primary hover:text-primary/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/findings/${finding.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {(currentUserRole === 'manager' || currentUserRole === 'analyst') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-error hover:text-error/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this finding?')) {
                            handleDeleteFinding(finding.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center bg-surface-high border-outline">
              <CheckCircle className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
              <p className="text-sm text-on-surface-variant">No findings yet</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4 bg-surface-high border-outline">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-error" />
                  <span className="text-xs text-on-surface-variant">High Priority</span>
                </div>
                <div className="text-lg font-bold text-on-surface font-technical">
                  {project.findings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs text-on-surface-variant">Approved</span>
                </div>
                <div className="text-lg font-bold text-on-surface font-technical">
                  {project.findings.filter((f) => f.status === 'approved').length}
                </div>
              </div>
            </div>
          </Card>

          {currentUserRole === 'manager' ? (
            <Card className="p-4 bg-surface-high border-outline">
              <h3 className="text-sm font-semibold text-on-surface mb-3">Project Actions</h3>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full border-error/30 text-error hover:bg-error/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </Card>
          ) : null}
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

export default ProjectDetailPage;
