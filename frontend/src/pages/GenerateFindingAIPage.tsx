import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Upload as UploadIcon, FileText, Shield, AlertTriangle, Plus, Trash2, Image as ImageIcon, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { findingApi } from '@/api/findingApi';
import { uploadApi } from '@/api/uploadApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface StepData {
  stepNumber: number;
  description: string;
  image?: string;
  caption?: string;
}

const GenerateFindingAIPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const parsedProjectId = projectId ? Number.parseInt(projectId, 10) : undefined;
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [draftFindingId, setDraftFindingId] = useState<number | null>(null);
  const [generatedFinding, setGeneratedFinding] = useState<any>(null);
  const [editableSteps, setEditableSteps] = useState<StepData[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    severity: 'Medium',
    vulnerabilityType: '',
    affectedEndpoint: '',
    evidence: '',
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    if (projectId) {
      const draftKey = `finding-draft-${projectId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setFormData(draft.formData || formData);
          setGeneratedFinding(draft.generatedFinding || null);
          setEditableSteps(draft.editableSteps || []);
          setStep(draft.step || 'input');
          if (draft.generatedFinding) {
            toast.success('Draft restored');
          }
        } catch (error) {
          console.error('Failed to restore draft:', error);
        }
      }
    }
  }, [projectId]);

  // Save draft to localStorage whenever state changes
  useEffect(() => {
    if (projectId && (formData.title || formData.evidence || generatedFinding)) {
      const draftKey = `finding-draft-${projectId}`;
      const draft = {
        formData,
        generatedFinding,
        editableSteps,
        step,
        timestamp: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [projectId, formData, generatedFinding, editableSteps, step]);

  // Clear draft from localStorage
  const clearDraft = () => {
    if (projectId) {
      const draftKey = `finding-draft-${projectId}`;
      localStorage.removeItem(draftKey);
    }
  };

  const severities = useMemo(
    () => [
      { value: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      { value: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
      { value: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      { value: 'Low', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      { value: 'Informational', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    ],
    []
  );

  const evidencePayload = `Vulnerability Type: ${formData.vulnerabilityType}\nAffected: ${formData.affectedEndpoint}\n\nEvidence:\n${formData.evidence}`;

  // Initialize editable steps when entering review with AI-generated steps
  const initializeEditableSteps = (steps: any[]) => {
    if (Array.isArray(steps) && steps.length > 0) {
      const converted = steps.map((step, index) => ({
        stepNumber: index + 1,
        description: typeof step === 'string' ? step : step.description || '',
        image: typeof step === 'object' ? step.image : undefined,
        caption: typeof step === 'object' ? step.caption : undefined,
      }));
      setEditableSteps(converted);
    } else {
      setEditableSteps([{ stepNumber: 1, description: '', image: '', caption: '' }]);
    }
  };

  const handleGenerate = async () => {
    if (!parsedProjectId) {
      toast.error('Missing project id');
      return;
    }
    if (!formData.title || !formData.evidence) {
      toast.error('Please provide a title and evidence');
      return;
    }

    try {
      setLoading(true);
      const response = await findingApi.generateContent({
        evidence: evidencePayload,
        severity: formData.severity,
        project_id: parsedProjectId,
      });
      const generated = response.data.data;
      setGeneratedFinding(generated);
      initializeEditableSteps(generated?.steps_to_reproduce || []);
      setStep('review');
      toast.success('Generated');
    } catch (error: any) {
      console.error('Failed to generate finding:', error);
      toast.error(`Failed to generate with AI${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!parsedProjectId || !generatedFinding) return;
    try {
      setLoading(true);
      // Filter out empty steps
      const validSteps = editableSteps.filter(s => s.description.trim() || s.image);
      
      console.log('Saving finding with steps:', validSteps);
      
      const response = await findingApi.create({
        title: generatedFinding.title || formData.title,
        severity: formData.severity,
        description: generatedFinding.description,
        affected_target: generatedFinding.affected_target,
        likelihood: generatedFinding.likelihood,
        impact: generatedFinding.impact,
        steps_to_reproduce: validSteps,
        recommendation: generatedFinding.recommendation,
        references: generatedFinding.references,
        project_id: parsedProjectId,
        status: 'draft',
      });
      const newId = response.data.data?.id;
      clearDraft(); // Clear draft after successful save
      toast.success('Finding saved successfully');
      if (newId) {
        navigate(`/findings/${newId}`);
      } else {
        navigate(`/projects/${projectId}`);
      }
    } catch (error: any) {
      console.error('Failed to save AI-generated finding:', error);
      console.error('Error response:', error?.response?.data);
      toast.error(error?.response?.data?.message || 'Failed to save finding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setStep('input');
    setGeneratedFinding(null);
  };

  const addStep = () => {
    const newStepNumber = editableSteps.length + 1;
    setEditableSteps([...editableSteps, { stepNumber: newStepNumber, description: '', image: '', caption: '' }]);
  };

  const removeStep = (index: number) => {
    if (editableSteps.length <= 1) return;
    const newSteps = editableSteps.filter((_, i) => i !== index).map((step, i) => ({ ...step, stepNumber: i + 1 }));
    setEditableSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof StepData, value: string) => {
    const newSteps = [...editableSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditableSteps(newSteps);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingImage(true);
      const response = await uploadApi.uploadStepImage(file);
      if (response.data) {
        updateStep(index, 'image', response.data.url);
        toast.success('Image uploaded');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImagePaste = async (index: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await handleImageUpload(index, file);
            break;
          }
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      await handleImageUpload(index, files[0]);
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Generate Finding with AI</h1>
        </div>
        <p className="text-sm md:text-base text-on-surface-variant">
          {step === 'input' && 'Step 1: Add details and generate finding'}
          {step === 'review' && 'Step 2: Review and accept the generated finding'}
        </p>
      </div>

      <Card className="p-6 bg-surface-high border-outline">
        {step === 'input' ? (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Finding Title <span className="text-error">*</span>
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
              <label className="text-sm font-medium text-on-surface mb-2 block">Vulnerability Type</label>
              <Input
                value={formData.vulnerabilityType}
                onChange={(e) => setFormData({ ...formData, vulnerabilityType: e.target.value })}
                placeholder="e.g., SQL Injection, XSS, CSRF"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">Affected Endpoint/IP</label>
              <Input
                value={formData.affectedEndpoint}
                onChange={(e) => setFormData({ ...formData, affectedEndpoint: e.target.value })}
                placeholder="e.g., https://example.com/api/login or 192.168.1.100"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Evidence / Technical Details <span className="text-error">*</span>
              </label>
              <textarea
                required
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                placeholder="Paste request/response, error messages, scan output, logs..."
                rows={12}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface font-mono text-sm"
              />
              <p className="mt-2 text-xs text-on-surface-variant">Tip: paste raw technical evidence for best results.</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)} className="border-outline text-on-surface-variant">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={loading || !formData.title || !formData.evidence}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'review' && generatedFinding ? (
          <div className="space-y-6">
            <Card className="p-6 bg-surface border-outline-variant">
              <div className="space-y-6">
                {/* Title */}
                <div className="pb-4 border-b border-outline-variant">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Title</h4>
                  <p className="text-base font-semibold text-on-surface">{generatedFinding.title}</p>
                </div>

                {/* Description */}
                <div className="pb-4 border-b border-outline-variant">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description
                  </h4>
                  <p className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                    {generatedFinding.description}
                  </p>
                </div>

                {/* Affected Target */}
                <div className="pb-4 border-b border-outline-variant">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Affected Target</h4>
                  <p className="text-sm text-on-surface font-mono bg-surface-low px-3 py-2 rounded">
                    {generatedFinding.affected_target || 'N/A'}
                  </p>
                </div>

                {/* Likelihood & Impact */}
                <div className="pb-4 border-b border-outline-variant">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Risk Assessment</h4>
                  <div className="space-y-4">
                    {generatedFinding.likelihood && (
                      <div className="bg-surface-low p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-on-surface uppercase">Likelihood:</span>
                          <Badge className={`${
                            generatedFinding.likelihood.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            generatedFinding.likelihood.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {generatedFinding.likelihood.severity || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {generatedFinding.likelihood.detail || 'N/A'}
                        </p>
                      </div>
                    )}

                    {generatedFinding.impact && (
                      <div className="bg-surface-low p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-on-surface" />
                          <span className="text-xs font-semibold text-on-surface uppercase">Impact:</span>
                          <Badge className={`${
                            generatedFinding.impact.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            generatedFinding.impact.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {generatedFinding.impact.severity || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {generatedFinding.impact.detail || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Steps to Reproduce */}
                <div className="pb-4 border-b border-outline-variant">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Steps to Reproduce</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={addStep} className="text-primary hover:text-primary/80">
                      <Plus className="w-4 h-4 mr-1" /> Add Step
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {editableSteps.map((step, index) => {
                      const imageUrl = step.image 
                        ? (step.image.startsWith('http') ? step.image : step.image.startsWith('/') ? `http://localhost:3000${step.image}` : step.image)
                        : '';
                      
                      return (
                        <div key={index} className="bg-surface-low p-4 rounded-lg border border-outline-variant space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary">Step {step.stepNumber}</span>
                            {editableSteps.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)} className="text-error hover:text-error/80">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <textarea
                            value={step.description}
                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                            placeholder="Describe this step..."
                            rows={2}
                            className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface text-sm resize-none"
                          />
                          <div>
                            <label className="text-xs text-on-surface-variant mb-2 block">Image (Optional)</label>
                            {uploadingImage ? (
                              <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center">
                                <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                                <p className="text-xs text-on-surface-variant">Uploading image...</p>
                              </div>
                            ) : imageUrl ? (
                              <div className="relative rounded-lg overflow-hidden border border-outline-variant bg-surface">
                                <img 
                                  src={imageUrl} 
                                  alt={`Step ${step.stepNumber}`} 
                                  className="w-full max-h-80 object-contain" 
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateStep(index, 'image', '')}
                                  className="absolute top-2 right-2 bg-surface/90 text-error hover:bg-error/20 rounded-full p-1.5"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="border-2 border-dashed border-outline-variant rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(index, e)}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id={`step-image-${index}`}
                                  onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                                />
                                <label htmlFor={`step-image-${index}`} className="cursor-pointer flex flex-col items-center gap-2">
                                  <UploadIcon className="w-6 h-6 text-on-surface-variant" />
                                  <div className="text-on-surface-variant">
                                    <p className="text-sm font-medium">Click to upload</p>
                                    <p className="text-xs mt-1">Paste (Ctrl+V) or drag & drop</p>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-on-surface-variant mb-1 block">Caption</label>
                            <Input
                              value={step.caption || ''}
                              onChange={(e) => updateStep(index, 'caption', e.target.value)}
                              placeholder="Add a caption for this image..."
                              className="bg-surface border-outline text-on-surface text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations */}
                {generatedFinding.recommendation && generatedFinding.recommendation.length > 0 && (
                  <div className="pb-4 border-b border-outline-variant">
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <ul className="list-disc list-outside ml-5 space-y-3">
                      {generatedFinding.recommendation.map((rec: string, index: number) => {
                        const match = rec.match(/^\*\*(.+?)\*\*:?\s*(.+)$/s);
                        if (match) {
                          return (
                            <li key={index} className="text-sm text-on-surface-variant">
                              <span className="font-semibold text-on-surface">{match[1]}:</span> {match[2]}
                            </li>
                          );
                        }
                        return (
                          <li key={index} className="text-sm text-on-surface-variant">
                            {rec}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* References */}
                {generatedFinding.references && generatedFinding.references.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">References</h4>
                    <ul className="space-y-2">
                      {generatedFinding.references.map((ref: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1">→</span>
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {ref}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <p className="text-sm text-green-400">
                ✓ Finding generated successfully! Review the details above and click "Accept & Save" to add it to your project.
              </p>
              <p className="text-xs text-green-400/70 mt-1">
                💾 Draft auto-saved. You can safely close this page and return later.
              </p>
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)} className="border-outline text-on-surface-variant">
                Back to Project
              </Button>
              <Button type="button" variant="ghost" onClick={handleRegenerate} disabled={loading || uploadingImage} className="text-on-surface">
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button type="button" onClick={() => void handleAccept()} disabled={loading || uploadingImage} className="bg-primary text-surface hover:bg-primary/90">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : uploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading image...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Accept & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default GenerateFindingAIPage;
