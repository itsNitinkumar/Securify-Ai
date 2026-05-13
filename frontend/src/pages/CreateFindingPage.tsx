import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { findingApi, CreateFindingData } from '@/api/findingApi';
import EvidenceUploader from '@/components/findings/EvidenceUploader';
import StepEditor from '@/components/findings/StepEditor';
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
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  interface Step {
    stepNumber: number;
    description: string;
    image?: string;
    caption?: string;
  }

  const [formData, setFormData] = useState<CreateFindingData>({
    title: '',
    severity: 'Medium',
    description: '',
    affected_target: '',
    likelihood: '',
    impact: '',
    steps_to_reproduce: [] as Step[],
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

  const saveDraft = async (data: CreateFindingData) => {
    if (!parsedProjectId) return;
    try {
      setIsSaving(true);
      if (draftId) {
        await findingApi.updateFinding(draftId, { ...data, project_id: parsedProjectId });
      } else {
        const response = await findingApi.create({ ...data, project_id: parsedProjectId, status: 'draft' });
        const newId = response.data.data?.id;
        if (newId) {
          setDraftId(newId);
        }
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (parsedProjectId && !draftId && !createdFindingId) {
      saveDraft({ ...formData, status: 'draft' });
    }
  }, [parsedProjectId]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (draftId && !createdFindingId) {
      saveTimeoutRef.current = setTimeout(() => {
        saveDraft(formData);
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, draftId]);

  const handleStepsChange = (steps: Step[]) => {
    const renumberedSteps = steps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));
    setFormData((current) => ({
      ...current,
      steps_to_reproduce: renumberedSteps,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parsedProjectId) {
      toast.error('Missing project id');
      return;
    }

    const filteredSteps = (formData.steps_to_reproduce || []).filter(
      (s: Step) => s.description.trim() || s.image
    );
    const submitData = { ...formData, steps_to_reproduce: filteredSteps };

    try {
      setLoading(true);
      let id: number | undefined;
      if (draftId) {
        await findingApi.updateFinding(draftId, { ...submitData, project_id: parsedProjectId, status: 'pending_review' });
        id = draftId;
      } else {
        const response = await findingApi.create({ ...submitData, project_id: parsedProjectId, status: 'pending_review' });
        id = response.data.data?.id;
      }
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
      {draftId && !createdFindingId && (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving draft...</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-4 w-4 text-green-500" />
              <span>Draft saved {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : null}
        </div>
      )}

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
                <StepEditor
                  steps={(formData.steps_to_reproduce || []) as Step[]}
                  onChange={handleStepsChange}
                />
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
