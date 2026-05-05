import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X } from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import EvidenceUploader from './EvidenceUploader';
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

interface EditFindingDialogProps {
  findingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditFindingDialog = ({ findingId, open, onOpenChange, onSuccess }: EditFindingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    severity: 'Medium',
    description: '',
    affected_target: '',
    likelihood: '',
    impact: '',
    steps_to_reproduce: [''],
    proof_of_concept: '',
    remediation: '',
    references: [''],
  });

  useEffect(() => {
    if (open && findingId) {
      loadFinding();
    }
  }, [open, findingId]);

  const loadFinding = async () => {
    try {
      setLoading(true);
      const response = await findingApi.getById(findingId);
      const data = response.data.data;
      if (data) {
        setFinding(data);
        const extractValue = (val: any): string => {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object' && val.detail) return val.detail;
          return String(val);
        };
        setFormData({
          title: data.title || '',
          severity: data.severity || 'Medium',
          description: data.description || '',
          affected_target: data.affected_target || '',
          likelihood: extractValue(data.likelihood),
          impact: extractValue(data.impact),
          steps_to_reproduce: data.steps_to_reproduce || [''],
          proof_of_concept: data.proof_of_concept || '',
          remediation: data.remediation || '',
          references: data.references || [''],
        });
      }
    } catch (error) {
      console.error('Failed to load finding:', error);
      alert('Failed to load finding');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await findingApi.update(findingId, formData);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update finding:', error);
      alert('Failed to update finding');
    } finally {
      setLoading(false);
    }
  };

  const severities = [
    { value: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { value: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { value: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'Low', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'Informational', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  ];

  const addStep = () => {
    setFormData({
      ...formData,
      steps_to_reproduce: [...formData.steps_to_reproduce, ''],
    });
  };

  const updateStep = (index: number, value: string) => {
    const steps = [...formData.steps_to_reproduce];
    steps[index] = value;
    setFormData({ ...formData, steps_to_reproduce: steps });
  };

  const removeStep = (index: number) => {
    const steps = formData.steps_to_reproduce.filter((_, i) => i !== index);
    setFormData({ ...formData, steps_to_reproduce: steps });
  };

  const addReference = () => {
    setFormData({
      ...formData,
      references: [...formData.references, ''],
    });
  };

  const updateReference = (index: number, value: string) => {
    const refs = [...formData.references];
    refs[index] = value;
    setFormData({ ...formData, references: refs });
  };

  const removeReference = (index: number) => {
    const refs = formData.references.filter((_, i) => i !== index);
    setFormData({ ...formData, references: refs });
  };

  if (!finding) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-on-surface-variant">Loading finding...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface">Edit Finding</DialogTitle>
          <DialogDescription>Make changes to the finding details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
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

          {/* Severity */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">
              Severity <span className="text-error">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {severities.map((sev) => (
                <Badge
                  key={sev.value}
                  className={`cursor-pointer px-4 py-2 ${
                    formData.severity === sev.value ? sev.color : 'bg-surface border-outline-variant'
                  }`}
                  onClick={() => setFormData({ ...formData, severity: sev.value })}
                >
                  {sev.value}
                </Badge>
              ))}
            </div>
          </div>

          {/* Affected Target */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Affected Target
            </label>
            <Input
              value={formData.affected_target}
              onChange={(e) => setFormData({ ...formData, affected_target: e.target.value })}
              placeholder="e.g., https://example.com/login"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the vulnerability..."
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
            />
          </div>

          {/* Likelihood */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Likelihood
            </label>
            <textarea
              value={formData.likelihood}
              onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })}
              placeholder="Assess the likelihood of exploitation..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
            />
          </div>

          {/* Impact */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Impact
            </label>
            <textarea
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              placeholder="Describe the potential impact..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-on-surface">
                Steps to Reproduce
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {formData.steps_to_reproduce.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-on-surface-variant mt-2">{index + 1}.</span>
                  <Input
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Enter step..."
                    className="flex-1 bg-surface border-outline text-on-surface"
                  />
                  {formData.steps_to_reproduce.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(index)}
                      className="text-error"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Proof of Concept */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Proof of Concept
            </label>
            <textarea
              value={formData.proof_of_concept}
              onChange={(e) => setFormData({ ...formData, proof_of_concept: e.target.value })}
              placeholder="Provide proof of concept..."
              rows={6}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface font-mono text-sm"
            />
          </div>

          {/* Remediation */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Remediation
            </label>
            <textarea
              value={formData.remediation}
              onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              placeholder="How to fix this vulnerability..."
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
            />
          </div>

          {/* References */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-on-surface">
                References
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={addReference}>
                <Plus className="w-4 h-4 mr-1" />
                Add Reference
              </Button>
            </div>
            <div className="space-y-2">
              {formData.references.map((ref, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ref}
                    onChange={(e) => updateReference(index, e.target.value)}
                    placeholder="e.g., OWASP Top 10 2021: A03 - Injection"
                    className="flex-1 bg-surface border-outline text-on-surface"
                  />
                  {formData.references.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeReference(index)}
                      className="text-error"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">
              Evidence
            </label>
            <EvidenceUploader findingId={findingId} />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFindingDialog;
