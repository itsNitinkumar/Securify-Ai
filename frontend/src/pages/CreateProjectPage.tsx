import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderPlus, Loader2 } from 'lucide-react';
import { projectApi, CreateProjectData } from '@/api/projectApi';
import { userApi } from '@/api/userApi';
import { templateApi, Template } from '@/api/templateApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingReporters, setLoadingReporters] = useState(false);
  const [reporters, setReporters] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    assigned_reporter_id: undefined as number | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });

  useEffect(() => {
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoadingTemplates(true);
        const res = await templateApi.getAllTemplates();
        const responseData = (res as any);
        const list = responseData?.data?.templates || responseData?.data || [];
        if (!cancelled) {
          setTemplates(Array.isArray(list) ? list : []);
          const defaultTmpl = list?.find((t: Template) => t.is_default);
          if (defaultTmpl) setSelectedTemplate(defaultTmpl);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        assigned_reporter_id: formData.assigned_reporter_id ?? undefined,
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      const response = await projectApi.createProject(payload);
      const created = (response as any)?.data || response;
      toast.success('Project created');
      navigate(`/projects/${created.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasPermission('create_projects')) {
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
          <p className="mt-2 text-sm text-on-surface-variant">You do not have permission to create projects.</p>
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
          <p className="text-sm md:text-base text-on-surface-variant">Set up a new security assessment project. You can add project details after creation.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">Start Date</label>
              <Input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData((c) => ({ ...c, start_date: e.target.value || undefined }))}
                className="bg-surface border-outline text-on-surface"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">End Date</label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData((c) => ({ ...c, end_date: e.target.value || undefined }))}
                className="bg-surface border-outline text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">Assigned Reporter</label>
            {loadingReporters ? (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading reporters...
              </div>
            ) : (
              <select
                value={formData.assigned_reporter_id ?? ''}
                onChange={(e) => setFormData((c) => ({ ...c, assigned_reporter_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">No reporter assigned</option>
                {reporters.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                ))}
              </select>
            )}
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
