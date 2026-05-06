import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { findingApi, CreateFindingData } from '@/api/findingApi';
import EvidenceUploader from '@/components/findings/EvidenceUploader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CreateFindingPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const parsedProjectId = projectId ? Number.parseInt(projectId, 10) : undefined;

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
    project_id: parsedProjectId,
  });

  const severities = [
    { value: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { value: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { value: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'Low', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'Informational', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  ];

  const addStep = () => {
    setFormData((current) => ({
      ...current,
      steps_to_reproduce: [...(current.steps_to_reproduce || []), ''],
    }));
  };

  const updateStep = (index: number, value: string) => {
    const next = [...(formData.steps_to_reproduce || [])];
    next[index] = value;
    setFormData((current) => ({ ...current, steps_to_reproduce: next }));
  };

  const removeStep = (index: number) => {
    const next = (formData.steps_to_reproduce || []).filter((_, i) => i !== index);
    setFormData((current) => ({ ...current, steps_to_reproduce: next.length ? next : [''] }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parsedProjectId) {
      toast.error('Missing project id');
      return;
    }

    try {
      setLoading(true);
      const response = await findingApi.create({ ...formData, project_id: parsedProjectId });
      const id = response.data.data?.id;
      setCreatedFindingId(id || null);
      toast.success('Finding created');
    } catch (error) {
      console.error('Failed to create finding:', error);
      toast.error('Failed to create finding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate(`/projects/${projectId}`)}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Create New Finding</h1>
        <p className="mt-1 text-sm md:text-base text-on-surface-variant">Add a security finding to this project.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 bg-surface-high border-outline">
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label className="text-sm font-medium text-on-surface mb-3 block">
                  Severity <span className="text-error">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {severities.map((sev) => (
                    <Badge
                      key={sev.value}
                      className={`cursor-pointer px-4 py-2 ${formData.severity === sev.value ? sev.color : 'bg-surface border-outline-variant'}`}
                      onClick={() => setFormData({ ...formData, severity: sev.value })}
                    >
                      {sev.value}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Affected Target</label>
                <Input
                  value={formData.affected_target || ''}
                  onChange={(e) => setFormData({ ...formData, affected_target: e.target.value })}
                  placeholder="e.g., https://example.com/login"
                  className="bg-surface border-outline text-on-surface"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the vulnerability..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-on-surface">Steps to Reproduce</label>
                  <Button type="button" size="sm" variant="outline" onClick={addStep}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.steps_to_reproduce || []).map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-on-surface-variant mt-2">{index + 1}.</span>
                      <Input
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder="Enter step..."
                        className="flex-1 bg-surface border-outline text-on-surface"
                      />
                      {(formData.steps_to_reproduce || []).length > 1 ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(index)} className="text-error">
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-on-surface mb-2 block">Remediation</label>
                <textarea
                  value={formData.remediation || ''}
                  onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
                  placeholder="How to fix this vulnerability..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)} className="border-outline text-on-surface-variant">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !!createdFindingId} className="bg-primary text-surface hover:bg-primary/90">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Finding'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 bg-surface-high border-outline">
            <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Evidence
            </h3>
            {createdFindingId ? (
              <div className="space-y-3">
                <p className="text-xs text-on-surface-variant">Upload screenshots/logs to attach to the finding.</p>
                <EvidenceUploader findingId={createdFindingId} />
                <Button onClick={() => navigate(`/findings/${createdFindingId}`)} className="w-full bg-primary text-surface hover:bg-primary/90">
                  View Finding
                </Button>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Create the finding first to upload evidence.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateFindingPage;
