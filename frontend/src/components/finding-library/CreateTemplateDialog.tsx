import { useState } from 'react';
import { findingLibraryApi, CreateTemplateData } from '@/api/findingLibraryApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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

const severities = ['critical', 'high', 'medium', 'low', 'info'];

const CreateTemplateDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateTemplateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateData>({
    title: '',
    category: 'Injection',
    severity: 'medium',
    description: '',
    remediation: '',
    is_public: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await findingLibraryApi.createTemplate(formData);
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        title: '',
        category: 'Injection',
        severity: 'medium',
        description: '',
        remediation: '',
        is_public: false,
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface">Create Finding Template</DialogTitle>
          <DialogDescription>Create a new finding template for the library.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
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

          {/* Category and Severity */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the vulnerability..."
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Affected Component */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Affected Component
            </label>
            <Input
              value={formData.affected_component || ''}
              onChange={(e) =>
                setFormData({ ...formData, affected_component: e.target.value })
              }
              placeholder="e.g., /api/v1/login endpoint"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Steps to Reproduce
            </label>
            <textarea
              value={formData.steps_to_reproduce || ''}
              onChange={(e) =>
                setFormData({ ...formData, steps_to_reproduce: e.target.value })
              }
              placeholder="1. Navigate to /login&#10;2. Enter payload in username field&#10;3. Observe response"
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
            />
          </div>

          {/* Remediation */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Remediation <span className="text-error">*</span>
            </label>
            <textarea
              required
              value={formData.remediation}
              onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              placeholder="Describe the remediation steps..."
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                OWASP Category
              </label>
              <Input
                value={formData.owasp_category || ''}
                onChange={(e) =>
                  setFormData({ ...formData, owasp_category: e.target.value })
                }
                placeholder="e.g., A03:2021"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                CWE ID
              </label>
              <Input
                value={formData.cwe_id || ''}
                onChange={(e) => setFormData({ ...formData, cwe_id: e.target.value })}
                placeholder="e.g., CWE-89"
                className="bg-surface border-outline text-on-surface"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                CVSS Score
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.cvss_score || ''}
                onChange={(e) =>
                  setFormData({ ...formData, cvss_score: parseFloat(e.target.value) })
                }
                placeholder="7.5"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Likelihood
              </label>
              <Input
                value={formData.likelihood || ''}
                onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })}
                placeholder="High"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Impact
              </label>
              <Input
                value={formData.impact || ''}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                placeholder="Critical"
                className="bg-surface border-outline text-on-surface"
              />
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="is_public" className="text-sm text-on-surface-variant">
              Make this template public (visible to all users)
            </label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-outline text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
