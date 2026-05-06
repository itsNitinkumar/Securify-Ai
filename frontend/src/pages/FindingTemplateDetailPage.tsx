import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  ExternalLink,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FindingTemplate, findingLibraryApi } from '@/api/findingLibraryApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const FindingTemplateDetailPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const templateId = Number(params.templateId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [template, setTemplate] = useState<FindingTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [edit, setEdit] = useState({
    title: '',
    category: '',
    severity: '',
    description: '',
    likelihood: '',
    impact: '',
    remediation: '',
    affected_component: '',
    steps_to_reproduce: '',
    reference_links: '' as string,
    owasp_category: '',
    cwe_id: '',
    cvss_score: '' as string,
    is_public: false,
  });

  const canSave = useMemo(() => {
    if (!isEditing) return false;
    if (saving) return false;
    return (
      edit.title.trim().length > 0 &&
      edit.category.trim().length > 0 &&
      edit.severity.trim().length > 0 &&
      edit.description.trim().length > 0 &&
      edit.likelihood.trim().length > 0 &&
      edit.impact.trim().length > 0 &&
      edit.remediation.trim().length > 0
    );
  }, [edit, isEditing, saving]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!Number.isFinite(templateId) || templateId <= 0) {
          toast.error('Invalid template id');
          navigate('/finding-library');
          return;
        }
        const response = await findingLibraryApi.getTemplate(templateId);
        const t: FindingTemplate | undefined = (response as any)?.data?.template;
        if (!t) throw new Error('Template missing from response');
        if (cancelled) return;
        setTemplate(t);
        setEdit({
          title: t.title || '',
          category: t.category || '',
          severity: t.severity || 'medium',
          description: t.description || '',
          likelihood: t.likelihood || '',
          impact: t.impact || '',
          remediation: t.remediation || '',
          affected_component: t.affected_component || '',
          steps_to_reproduce: t.steps_to_reproduce || '',
          reference_links: (t.reference_links || []).join('\n'),
          owasp_category: t.owasp_category || '',
          cwe_id: t.cwe_id || '',
          cvss_score: typeof t.cvss_score === 'number' ? String(t.cvss_score) : '',
          is_public: !!t.is_public,
        });
      } catch (error) {
        console.error('Failed to load template', error);
        toast.error('Failed to load template');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, templateId]);

  const handleCopy = async () => {
    if (!template) return;
    const text = `${template.title}\n\n${template.description}\n\nRemediation:\n${template.remediation}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSave = async () => {
    if (!template) return;
    if (!canSave) return;
    try {
      setSaving(true);

      const links = edit.reference_links
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const cvss = edit.cvss_score.trim() ? Number(edit.cvss_score) : undefined;
      if (edit.cvss_score.trim() && (Number.isNaN(cvss) || cvss! < 0 || cvss! > 10)) {
        toast.error('CVSS score must be between 0 and 10');
        return;
      }

      const updatePayload = {
        title: edit.title.trim(),
        category: edit.category.trim(),
        severity: edit.severity.trim(),
        description: edit.description.trim(),
        likelihood: edit.likelihood.trim(),
        impact: edit.impact.trim(),
        remediation: edit.remediation.trim(),
        affected_component: edit.affected_component.trim() || undefined,
        steps_to_reproduce: edit.steps_to_reproduce.trim() || undefined,
        reference_links: links.length ? links : undefined,
        owasp_category: edit.owasp_category.trim() || undefined,
        cwe_id: edit.cwe_id.trim() || undefined,
        cvss_score: cvss,
        is_public: edit.is_public,
      };

      const response = await findingLibraryApi.updateTemplate(template.id, updatePayload);
      const updated: FindingTemplate | undefined = (response as any)?.data?.template;
      if (updated) {
        setTemplate(updated);
      }
      toast.success('Template updated');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update template', error);
      toast.error(error?.response?.data?.message || 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;

    // No dialogs allowed. Provide a safe, non-destructive path: disable in-page delete for now.
    toast.error('Delete is disabled in this build (dialogs not allowed).');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/finding-library')}
          className="mb-4 text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Finding Library
        </Button>
        <Card className="p-6 bg-surface-high border-outline">
          <p className="text-on-surface">Template not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/finding-library')}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Finding Library
      </Button>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={severityColors[template.severity] || severityColors.medium}>
                {template.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-outline text-on-surface-variant">
                {template.category}
              </Badge>
              {template.is_public && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  PUBLIC
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">{template.title}</h1>
            <p className="text-sm text-on-surface-variant">View and manage template details.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="border-outline text-on-surface-variant hover:text-primary"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditing((v) => !v)}
            className="border-outline text-on-surface-variant hover:text-primary"
          >
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="border-error/30 text-error hover:bg-error/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 bg-surface-high border-outline">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">
                  Title <span className="text-error">*</span>
                </label>
                <Input
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  className="bg-surface border-outline text-on-surface"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Category <span className="text-error">*</span>
                  </label>
                  <Input
                    value={edit.category}
                    onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Severity <span className="text-error">*</span>
                  </label>
                  <select
                    value={edit.severity}
                    onChange={(e) => setEdit({ ...edit, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.keys(severityColors).map((sev) => (
                      <option key={sev} value={sev}>
                        {sev.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">
                  Description <span className="text-error">*</span>
                </label>
                <textarea
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Likelihood <span className="text-error">*</span>
                  </label>
                  <Input
                    value={edit.likelihood}
                    onChange={(e) => setEdit({ ...edit, likelihood: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Impact <span className="text-error">*</span>
                  </label>
                  <Input
                    value={edit.impact}
                    onChange={(e) => setEdit({ ...edit, impact: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">
                  Remediation <span className="text-error">*</span>
                </label>
                <textarea
                  value={edit.remediation}
                  onChange={(e) => setEdit({ ...edit, remediation: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Affected Component</label>
                <Input
                  value={edit.affected_component}
                  onChange={(e) => setEdit({ ...edit, affected_component: e.target.value })}
                  className="bg-surface border-outline text-on-surface"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Steps to Reproduce</label>
                <textarea
                  value={edit.steps_to_reproduce}
                  onChange={(e) => setEdit({ ...edit, steps_to_reproduce: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">OWASP Category</label>
                  <Input
                    value={edit.owasp_category}
                    onChange={(e) => setEdit({ ...edit, owasp_category: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">CWE ID</label>
                  <Input
                    value={edit.cwe_id}
                    onChange={(e) => setEdit({ ...edit, cwe_id: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">CVSS Score</label>
                  <Input
                    value={edit.cvss_score}
                    onChange={(e) => setEdit({ ...edit, cvss_score: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                    placeholder="0.0 - 10.0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">Reference Links</label>
                  <textarea
                    value={edit.reference_links}
                    onChange={(e) => setEdit({ ...edit, reference_links: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                    placeholder={'https://example.com\nhttps://another.example'}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={edit.is_public}
                  onChange={(e) => setEdit({ ...edit, is_public: e.target.checked })}
                  className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="is_public" className="text-sm text-on-surface-variant">
                  Public template
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="bg-primary text-surface hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface rounded-lg border border-outline-variant">
                {template.cvss_score != null && (
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">CVSS</p>
                    <p className="text-lg font-semibold text-primary">{template.cvss_score}</p>
                  </div>
                )}
                {template.cwe_id && (
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">CWE</p>
                    <p className="text-sm text-on-surface">{template.cwe_id}</p>
                  </div>
                )}
                {template.owasp_category && (
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">OWASP</p>
                    <p className="text-sm text-on-surface">{template.owasp_category}</p>
                  </div>
                )}
                {template.likelihood && (
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Likelihood</p>
                    <p className="text-sm text-on-surface">{template.likelihood}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-2">Description</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                  {template.description}
                </p>
              </div>

              {template.affected_component && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">Affected Component</h3>
                  <p className="text-sm text-on-surface-variant">{template.affected_component}</p>
                </div>
              )}

              {template.steps_to_reproduce && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">Steps to Reproduce</h3>
                  <div className="p-3 bg-surface rounded border border-outline-variant">
                    <pre className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono">
                      {template.steps_to_reproduce}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-2">Remediation Strategy</h3>
                <div className="p-4 bg-primary/5 rounded border border-primary/20">
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {template.remediation}
                  </p>
                </div>
              </div>

              {template.impact && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">Impact</h3>
                  <p className="text-sm text-on-surface-variant">{template.impact}</p>
                </div>
              )}

              {template.reference_links && template.reference_links.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">References</h3>
                  <div className="space-y-2">
                    {template.reference_links.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-surface-high border-outline">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Actions</h3>
          <div className="space-y-2">
            <Button
              className="w-full bg-primary text-surface hover:bg-primary/90"
              onClick={() => toast('Insert into report: not wired yet')}
            >
              Insert into Report
            </Button>
            <Button
              variant="outline"
              className="w-full border-outline text-on-surface-variant"
              onClick={() => navigate('/finding-library/new')}
            >
              Create Another
            </Button>
          </div>
          <p className="mt-4 text-xs text-on-surface-variant">
            Note: Delete requires an explicit in-page confirmation flow. Dialogs are not allowed.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FindingTemplateDetailPage;
