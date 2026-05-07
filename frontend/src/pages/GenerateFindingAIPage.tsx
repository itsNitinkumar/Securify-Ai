import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Upload, FileText, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { findingApi } from '@/api/findingApi';
import EvidenceUploader from '@/components/findings/EvidenceUploader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const GenerateFindingAIPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const parsedProjectId = projectId ? Number.parseInt(projectId, 10) : undefined;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'evidence' | 'generate' | 'review'>('evidence');
  const [draftFindingId, setDraftFindingId] = useState<number | null>(null);
  const [generatedFinding, setGeneratedFinding] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    severity: 'Medium',
    vulnerabilityType: '',
    affectedEndpoint: '',
    evidence: '',
  });

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

  const handleCreateDraft = async () => {
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
      const response = await findingApi.create({
        title: formData.title,
        severity: formData.severity,
        description: evidencePayload,
        affected_target: formData.affectedEndpoint,
        project_id: parsedProjectId,
      });
      const id = response.data.data?.id || null;
      setDraftFindingId(id);
      setStep('generate');
      toast.success('Draft created');
    } catch (error) {
      console.error('Failed to create draft finding:', error);
      toast.error('Failed to create draft finding');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!draftFindingId) return;
    try {
      setLoading(true);
      const response = await findingApi.generateContent({
        evidence: evidencePayload,
        severity: formData.severity,
        project_id: parsedProjectId,
      });
      setGeneratedFinding(response.data.data);
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
    if (!draftFindingId || !generatedFinding) return;
    try {
      setLoading(true);
      await findingApi.update(draftFindingId, {
        title: generatedFinding.title,
        description: generatedFinding.description,
        affected_target: generatedFinding.affected_target,
        likelihood: generatedFinding.likelihood,
        impact: generatedFinding.impact,
        steps_to_reproduce: generatedFinding.steps_to_reproduce,
        recommendation: generatedFinding.recommendation,
        references: generatedFinding.references,
      });
      toast.success('Saved');
      navigate(`/findings/${draftFindingId}`);
    } catch (error) {
      console.error('Failed to save AI-generated finding:', error);
      toast.error('Failed to save generated finding');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setStep('generate');
    setGeneratedFinding(null);
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
          {step === 'evidence' && 'Step 1: Add evidence and basic information'}
          {step === 'generate' && 'Step 2: Upload screenshots and generate with AI'}
          {step === 'review' && 'Step 3: Review and accept the generated finding'}
        </p>
      </div>

      <Card className="p-6 bg-surface-high border-outline">
        {step === 'evidence' ? (
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
                onClick={() => void handleCreateDraft()}
                disabled={loading || !formData.title || !formData.evidence}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Draft...
                  </>
                ) : (
                  'Next: Upload Evidence'
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'generate' && draftFindingId ? (
          <div className="space-y-6">
            <Card className="p-4 bg-surface border-outline-variant">
              <h4 className="text-sm font-semibold text-on-surface mb-2">Draft Finding Created</h4>
              <p className="text-sm text-on-surface-variant mb-1">Title: {formData.title}</p>
              <p className="text-sm text-on-surface-variant">Severity: {formData.severity}</p>
            </Card>

            <div>
              <label className="text-sm font-medium text-on-surface mb-3 block flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Supporting Evidence (Screenshots, Logs, Scan Results)
              </label>
              <EvidenceUploader findingId={draftFindingId} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)} className="border-outline text-on-surface-variant">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={loading}
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
                {generatedFinding.steps_to_reproduce && generatedFinding.steps_to_reproduce.length > 0 && (
                  <div className="pb-4 border-b border-outline-variant">
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Steps to Reproduce</h4>
                    <ol className="list-decimal list-inside text-sm text-on-surface-variant space-y-2 ml-2">
                      {generatedFinding.steps_to_reproduce.map((step: string, index: number) => (
                        <li key={index} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

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
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}`)} className="border-outline text-on-surface-variant">
                Back to Project
              </Button>
              <Button type="button" variant="ghost" onClick={handleRegenerate} disabled={loading} className="text-on-surface">
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button type="button" onClick={() => void handleAccept()} disabled={loading} className="bg-primary text-surface hover:bg-primary/90">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Accept & Save'
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
