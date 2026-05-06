import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { findingLibraryApi, CreateTemplateData } from '@/api/findingLibraryApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const categories = [
  'Injection',
  'Authentication',
  'Cryptographic',
  'Access Control',
  'Security Misconfiguration',
  'XSS',
  'Insecure Design',
  'Vulnerable Components',
  'SSRF',
  'Other',
];

const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;

const FindingTemplateCreatePage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateData>({
    title: '',
    category: 'Injection',
    severity: 'medium',
    description: '',
    likelihood: '',
    impact: '',
    remediation: '',
    is_public: false,
    affected_component: '',
    steps_to_reproduce: '',
    owasp_category: '',
    cwe_id: '',
  });

  const canSubmit = useMemo(() => {
    return (
      formData.title.trim().length > 0 &&
      formData.category.trim().length > 0 &&
      String(formData.severity).trim().length > 0 &&
      formData.description.trim().length > 0 &&
      (formData.likelihood || '').trim().length > 0 &&
      (formData.impact || '').trim().length > 0 &&
      formData.remediation.trim().length > 0 &&
      !submitting
    );
  }, [formData, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Backend requires likelihood + impact.
    if (!(formData.likelihood || '').trim() || !(formData.impact || '').trim()) {
      toast.error('Likelihood and Impact are required');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateTemplateData = {
        ...formData,
        // Normalize empty strings to undefined for optional fields.
        affected_component: formData.affected_component?.trim() ? formData.affected_component : undefined,
        steps_to_reproduce: formData.steps_to_reproduce?.trim() ? formData.steps_to_reproduce : undefined,
        owasp_category: formData.owasp_category?.trim() ? formData.owasp_category : undefined,
        cwe_id: formData.cwe_id?.trim() ? formData.cwe_id : undefined,
        likelihood: formData.likelihood?.trim(),
        impact: formData.impact?.trim(),
      };

      const response = await findingLibraryApi.createTemplate(payload);
      const created = (response as any)?.data?.template || (response as any)?.template;
      toast.success('Template created');
      if (created?.id) {
        navigate(`/finding-library/${created.id}`);
      } else {
        navigate('/finding-library');
      }
    } catch (error: any) {
      console.error('Failed to create template', error);
      toast.error(error?.response?.data?.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Create Template</h1>
          <p className="text-sm text-on-surface-variant">
            Add a new finding template to the library.
          </p>
        </div>
      </div>

      <Card className="max-w-4xl p-6 bg-surface-high border-outline">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Title <span className="text-error">*</span>
            </label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., SQL Injection in Login Form"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Category <span className="text-error">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Severity <span className="text-error">*</span>
              </label>
              <select
                required
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {severities.map((sev) => (
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
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Describe the vulnerability..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Likelihood <span className="text-error">*</span>
              </label>
              <Input
                required
                value={formData.likelihood || ''}
                onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })}
                className="bg-surface border-outline text-on-surface"
                placeholder="e.g., High"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Impact <span className="text-error">*</span>
              </label>
              <Input
                required
                value={formData.impact || ''}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="bg-surface border-outline text-on-surface"
                placeholder="e.g., Critical"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Remediation <span className="text-error">*</span>
            </label>
            <textarea
              required
              value={formData.remediation}
              onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Describe remediation steps..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">Affected Component</label>
            <Input
              value={formData.affected_component || ''}
              onChange={(e) => setFormData({ ...formData, affected_component: e.target.value })}
              className="bg-surface border-outline text-on-surface"
              placeholder="e.g., /api/v1/login"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">Steps to Reproduce</label>
            <textarea
              value={formData.steps_to_reproduce || ''}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              placeholder={'1. Navigate to /login\n2. Enter payload\n3. Observe response'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">OWASP Category</label>
              <Input
                value={formData.owasp_category || ''}
                onChange={(e) => setFormData({ ...formData, owasp_category: e.target.value })}
                className="bg-surface border-outline text-on-surface"
                placeholder="e.g., A03:2021"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">CWE ID</label>
              <Input
                value={formData.cwe_id || ''}
                onChange={(e) => setFormData({ ...formData, cwe_id: e.target.value })}
                className="bg-surface border-outline text-on-surface"
                placeholder="e.g., CWE-89"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={!!formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="is_public" className="text-sm text-on-surface-variant">
              Make this template public (visible to all users)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/finding-library')}
              className="border-outline text-on-surface-variant"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-surface hover:bg-primary/90"
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FindingTemplateCreatePage;
