import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderPlus, Loader2 } from 'lucide-react';
import { projectApi, CreateProjectData } from '@/api/projectApi';
import { authApi } from '@/api/authApi';
import { clientApi, Client } from '@/api/clientApi';
import { templateApi, Template } from '@/api/templateApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<CreateProjectData>(() => {
    const saved = localStorage.getItem('createProjectForm');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          name: '',
          client_name: undefined,
          client_id: undefined,
          template_id: undefined,
          template_name: undefined,
        };
      }
    }
    return {
      name: '',
      client_name: undefined,
      client_id: undefined,
      template_id: undefined,
      template_name: undefined,
    };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('createProjectForm', JSON.stringify(formData));
  }, [formData]);

  // Lightweight role check to avoid a dead-end for non-managers.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await authApi.getProfile();
        const user = (profile.data as any)?.data || (profile.data as any)?.user || profile.data;
        if (!cancelled) setCurrentUserRole(user?.role || '');
      } catch {
        if (!cancelled) setCurrentUserRole('');
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
        setLoadingClients(true);
        const res = await clientApi.listClients();
        const list = (res as any)?.data || res;
        if (!cancelled) setClients(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Failed to load clients:', error);
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load templates
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoadingTemplates(true);
        const res = await templateApi.getAllTemplates();
        const responseData = (res as any);
        // Handle both formats: { data: { templates } } or { data: { templates: [] } }
        const list = responseData?.data?.templates || responseData?.data || [];
        if (!cancelled) {
          setTemplates(Array.isArray(list) ? list : []);
          // Auto-select saved template or default template
          const savedTemplateId = formData.template_id;
          if (savedTemplateId) {
            const savedTmpl = list?.find((t: Template) => t.id === savedTemplateId);
            if (savedTmpl) setSelectedTemplate(savedTmpl);
          } else {
            const defaultTmpl = list?.find((t: Template) => t.is_default);
            if (defaultTmpl) setSelectedTemplate(defaultTmpl);
          }
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const selectClient = (client: Client | null) => {
    if (!client) {
      setSelectedClientId(null);
      setClientQuery('');
      setFormData((current) => ({ ...current, client_id: undefined, client_name: undefined }));
      return;
    }
    setSelectedClientId(client.id);
    setClientQuery(client.name);
    setFormData((current) => ({ ...current, client_id: client.id, client_name: undefined }));
  };

  const handleAddClient = async () => {
    const name = clientQuery.trim();
    if (!name) return;
    try {
      setLoadingClients(true);
      const res = await clientApi.createClient(name);
      const created = (res as any)?.data || res;
      const client = created as Client;
      setClients((current) => {
        const exists = current.some((c) => c.id === client.id || c.name.toLowerCase() === client.name.toLowerCase());
        const next = exists ? current : [...current, client];
        return next.slice().sort((a, b) => a.name.localeCompare(b.name));
      });
      selectClient(client);
      toast.success('Client added');
    } catch (error) {
      console.error('Failed to add client:', error);
      toast.error('Failed to add client');
    } finally {
      setLoadingClients(false);
    }
  };

  const updateApplicationRow = (idx: number, patch: Partial<{ name: string; url: string }>) => {
    setFormData((current) => {
      const rows = Array.isArray(current.application_details) ? current.application_details.slice() : [];
      const prev = rows[idx] || { name: '', url: '' };
      rows[idx] = { ...prev, ...patch };
      return { ...current, application_details: rows };
    });
  };

  const addApplicationRow = () => {
    setFormData((current) => ({
      ...current,
      application_details: [...(current.application_details || []), { name: '', url: '' }],
    }));
  };

  const removeApplicationRow = (idx: number) => {
    setFormData((current) => {
      const rows = (current.application_details || []).slice();
      rows.splice(idx, 1);
      return { ...current, application_details: rows.length ? rows : [{ name: '', url: '' }] };
    });
  };

  const updateUserRoleRow = (idx: number, patch: Partial<{ role: string; username: string }>) => {
    setFormData((current) => {
      const rows = Array.isArray(current.user_roles) ? current.user_roles.slice() : [];
      const prev = rows[idx] || { role: '', username: '' };
      rows[idx] = { ...prev, ...patch };
      return { ...current, user_roles: rows };
    });
  };

  const addUserRoleRow = () => {
    setFormData((current) => ({
      ...current,
      user_roles: [...(current.user_roles || []), { role: '', username: '' }],
    }));
  };

  const removeUserRoleRow = (idx: number) => {
    setFormData((current) => {
      const rows = (current.user_roles || []).slice();
      rows.splice(idx, 1);
      return { ...current, user_roles: rows.length ? rows : [{ role: '', username: '' }] };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    try {
      setSubmitting(true);

      const payload: CreateProjectData = {
        name: formData.name,
        client_id: selectedClientId || undefined,
        client_name: !selectedClientId && clientQuery.trim() ? clientQuery.trim() : undefined,
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
      };

      const response = await projectApi.createProject(payload);
      const created = (response as any)?.data || response;
      toast.success('Project created');
      localStorage.removeItem('createProjectForm');
      navigate(`/projects/${created.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUserRole !== null && currentUserRole !== 'manager') {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-4 text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card className="p-8 bg-surface-high border-outline">
          <h1 className="text-xl font-semibold text-on-surface">Not Authorized</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Only managers can create projects.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/projects')}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderPlus className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Create New Project</h1>
          </div>
          <p className="text-sm md:text-base text-on-surface-variant">Select a template and client to create a new security assessment project. You can add project details after creation.</p>
        </div>
      </div>

      <Card className="max-w-3xl p-6 bg-surface-high border-outline">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Project Name <span className="text-error">*</span>
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q3 2024 Infrastructure Pentest"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">Client Name</label>
            <div className="space-y-2">
              <Input
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setSelectedClientId(null);
                }}
                placeholder="Type to search or add a new client"
                className="bg-surface border-outline text-on-surface"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-on-surface-variant">
                  {selectedClient ? (
                    <>Selected: <span className="text-on-surface">{selectedClient.name}</span></>
                  ) : clientQuery.trim() ? (
                    <>New client: <span className="text-on-surface">{clientQuery.trim()}</span></>
                  ) : (
                    'Select an existing client or add a new one.'
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedClient ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => selectClient(null)}
                      className="border-outline text-on-surface-variant"
                    >
                      Clear
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddClient}
                      disabled={loadingClients || !clientQuery.trim()}
                      className="border-outline text-on-surface-variant"
                    >
                      {loadingClients ? 'Adding...' : 'Add Client'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-44 overflow-auto rounded-md border border-outline-variant bg-surface">
                {filteredClients.length ? (
                  <div className="divide-y divide-outline-variant">
                    {filteredClients.slice(0, 50).map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-high ${selectedClientId === client.id ? 'bg-surface-high text-primary' : 'text-on-surface'}`}
                      >
                        {client.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-on-surface-variant">No clients found</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Report Template <span className="text-error">*</span>
            </label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading templates...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const tmpl = templates.find(t => t.id === Number(e.target.value));
                    setSelectedTemplate(tmpl || null);
                  }}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select a template</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} {tmpl.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="text-xs text-on-surface-variant">
                    {selectedTemplate.description || 'Selected template will be used for all reports'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/projects')} className="border-outline text-on-surface-variant">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary text-surface hover:bg-primary/90">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateProjectPage;
