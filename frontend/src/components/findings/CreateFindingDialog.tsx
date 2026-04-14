import { useState } from 'react';
import { Plus, Loader2, Sparkles, Upload } from 'lucide-react';
import { findingApi, CreateFindingData } from '@/api/findingApi';
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

interface CreateFindingDialogProps {
  projectId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateFindingDialog = ({ projectId, open, onOpenChange, onSuccess }: CreateFindingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [createdFindingId, setCreatedFindingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateFindingData>({
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
    project_id: projectId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await findingApi.create(formData);
      setCreatedFindingId(response.data.data?.id || null);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create finding:', error);
      alert('Failed to create finding');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
      project_id: projectId,
    });
    setCreatedFindingId(null);
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
      steps_to_reproduce: [...(formData.steps_to_reproduce || []), ''],
    });
  };

  const updateStep = (index: number, value: string) => {
    const steps = [...(formData.steps_to_reproduce || [])];
    steps[index] = value;
    setFormData({ ...formData, steps_to_reproduce: steps });
  };

  const removeStep = (index: number) => {
    const steps = formData.steps_to_reproduce?.filter((_, i) => i !== index);
    setFormData({ ...formData, steps_to_reproduce: steps });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface">Create New Finding</DialogTitle>
          <DialogDescription>Add a security finding to the project.</DialogDescription>
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

          {/* Steps to Reproduce */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-on-surface">
                Steps to Reproduce
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {formData.steps_to_reproduce?.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-on-surface-variant mt-2">{index + 1}.</span>
                  <Input
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Enter step..."
                    className="flex-1 bg-surface border-outline text-on-surface"
                  />
                  {formData.steps_to_reproduce && formData.steps_to_reproduce.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(index)}
                      className="text-error"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
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

          {/* Evidence Upload */}
          {createdFindingId && (
            <div>
              <label className="text-sm font-medium text-on-surface mb-3 block flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Evidence
              </label>
              <EvidenceUploader findingId={createdFindingId} />
            </div>
          )}

          <DialogFooter className="gap-2">
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Finding
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFindingDialog;
