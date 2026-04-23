import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Upload } from 'lucide-react';
import { findingApi } from '@/api/findingApi';
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
import { Card } from '@/components/ui/card';

interface AIGenerateDialogProps {
  projectId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AIGenerateDialog = ({ projectId, open, onOpenChange, onSuccess }: AIGenerateDialogProps) => {
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

  // Step 1: Create draft finding with basic info
  const handleCreateDraft = async () => {
    if (!formData.title || !formData.evidence) {
      alert('Please provide a title and evidence');
      return;
    }

    try {
      setLoading(true);
      const response = await findingApi.create({
        title: formData.title,
        severity: formData.severity,
        description: `Vulnerability Type: ${formData.vulnerabilityType}\nAffected: ${formData.affectedEndpoint}\n\nEvidence:\n${formData.evidence}`,
        affected_target: formData.affectedEndpoint,
        project_id: projectId,
      });
      
      setDraftFindingId(response.data.data?.id || null);
      setStep('generate');
    } catch (error) {
      console.error('Failed to create draft finding:', error);
      alert('Failed to create draft finding');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate with AI (after evidence is uploaded)
  const handleGenerate = async () => {
    if (!draftFindingId) return;

    try {
      setLoading(true);
      console.log('Sending generate request...');
      // Call the new generateContent endpoint (doesn't create a finding)
      const response = await findingApi.generateContent({
        evidence: `Vulnerability Type: ${formData.vulnerabilityType}\nAffected: ${formData.affectedEndpoint}\n\nEvidence:\n${formData.evidence}`,
        severity: formData.severity,
        project_id: projectId,
      });
      
      console.log('Response received:', response);
      console.log('Response data:', response.data);
      
      setGeneratedFinding(response.data.data);
      setStep('review');
    } catch (error: any) {
      console.error('Failed to generate finding:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      alert('Failed to generate finding with AI: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!draftFindingId || !generatedFinding) return;

    try {
      setLoading(true);
      // Update the draft finding with AI-generated content
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
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save AI-generated finding:', error);
      alert('Failed to save AI-generated finding');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setStep('generate');
    setGeneratedFinding(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      severity: 'Medium',
      vulnerabilityType: '',
      affectedEndpoint: '',
      evidence: '',
    });
    setDraftFindingId(null);
    setGeneratedFinding(null);
    setStep('evidence');
  };

  const severities = [
    { value: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { value: 'High', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { value: 'Medium', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    { value: 'Low', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'Informational', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Generate Finding with AI
          </DialogTitle>
          <DialogDescription>
            {step === 'evidence' && 'Step 1: Add evidence and basic information'}
            {step === 'generate' && 'Step 2: Upload screenshots and generate with AI'}
            {step === 'review' && 'Step 3: Review and accept the generated finding'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Evidence Input */}
        {step === 'evidence' && (
          <div className="space-y-6 mt-4">
            {/* Title */}
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

            {/* Vulnerability Type */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Vulnerability Type
              </label>
              <Input
                value={formData.vulnerabilityType}
                onChange={(e) => setFormData({ ...formData, vulnerabilityType: e.target.value })}
                placeholder="e.g., SQL Injection, XSS, CSRF"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            {/* Affected Endpoint */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Affected Endpoint/IP
              </label>
              <Input
                value={formData.affectedEndpoint}
                onChange={(e) => setFormData({ ...formData, affectedEndpoint: e.target.value })}
                placeholder="e.g., https://example.com/api/login or 192.168.1.100"
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            {/* Evidence */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Evidence / Technical Details <span className="text-error">*</span>
              </label>
              <textarea
                required
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                placeholder="Paste your technical evidence here:&#10;&#10;Example:&#10;- HTTP Request/Response&#10;- Error messages&#10;- SQL query output&#10;- Scan results (Nessus, Nuclei, Burp)&#10;- Command output&#10;- Server logs&#10;&#10;The more details you provide, the better the AI-generated finding will be."
                rows={12}
                className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface font-mono text-sm"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-on-surface-variant">
                  💡 <span className="font-semibold">Tip:</span> Paste raw technical evidence - request/response, error messages, scan output
                </p>
                <p className="text-xs text-green-400">
                  🔒 <span className="font-semibold">Auto-Sanitized:</span> IPs, credentials, and API keys will be sanitized before AI processing
                </p>
              </div>
            </div>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-on-surface mb-2">
                <span className="font-semibold">📋 Workflow:</span>
              </p>
              <ol className="text-xs text-on-surface-variant space-y-1 ml-4">
                <li>1. Add evidence and basic info (this step)</li>
                <li>2. Upload screenshots/files as supporting evidence</li>
                <li>3. Generate comprehensive finding with AI</li>
                <li>4. Review and edit if needed</li>
                <li>5. Submit for review</li>
              </ol>
            </Card>
          </div>
        )}

        {/* Step 2: Upload Evidence & Generate */}
        {step === 'generate' && draftFindingId && (
          <div className="space-y-6 mt-4">
            <Card className="p-4 bg-surface border-outline-variant">
              <h4 className="text-sm font-semibold text-on-surface mb-2">Draft Finding Created</h4>
              <p className="text-sm text-on-surface-variant mb-1">Title: {formData.title}</p>
              <p className="text-sm text-on-surface-variant">Severity: {formData.severity}</p>
            </Card>

            {/* Evidence Upload */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-3 block flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Supporting Evidence (Screenshots, Logs, Scan Results)
              </label>
              <EvidenceUploader findingId={draftFindingId} />
            </div>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-on-surface mb-2">
                <span className="font-semibold">✨ Ready to generate?</span>
              </p>
              <p className="text-xs text-on-surface-variant">
                Once you've uploaded your evidence, click "Generate with AI" to create a comprehensive finding with:
              </p>
              <ul className="text-xs text-on-surface-variant space-y-1 ml-4 mt-2">
                <li>• Detailed Description</li>
                <li>• Likelihood & Impact Analysis</li>
                <li>• Steps to Reproduce</li>
                <li>• Proof of Concept</li>
                <li>• Remediation Recommendations</li>
                <li>• References</li>
              </ul>
            </Card>
          </div>
        )}

        {/* Step 3: Review Generated Finding */}
        {step === 'review' && generatedFinding && (
          <div className="space-y-6 mt-4">
            <Card className="p-4 bg-surface border-outline-variant">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Title</h4>
                  <p className="text-sm text-on-surface-variant">{generatedFinding.title}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Description</h4>
                  <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                    {generatedFinding.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Affected Target</h4>
                  <p className="text-sm text-on-surface-variant">{generatedFinding.affected_target || 'N/A'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Impact & Likelihood</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">
                        Impact: {generatedFinding.impact?.severity || 'N/A'}
                      </span>
                      {' – '}
                      {generatedFinding.impact?.detail || 'N/A'}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">
                        Likelihood: {generatedFinding.likelihood?.severity || 'N/A'}
                      </span>
                      {' – '}
                      {generatedFinding.likelihood?.detail || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Steps to Reproduce</h4>
                  <ol className="list-decimal list-inside text-sm text-on-surface-variant space-y-1">
                    {generatedFinding.steps_to_reproduce?.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    )) || <li>No steps provided</li>}
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-2">Recommendation</h4>
                  <ul className="text-sm text-on-surface-variant space-y-2">
                    {generatedFinding.recommendation?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span dangerouslySetInnerHTML={{ __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </li>
                    )) || <li>No recommendations provided</li>}
                  </ul>
                </div>

                {generatedFinding.references && generatedFinding.references.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface mb-2">References</h4>
                    <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
                      {generatedFinding.references.map((ref: string, index: number) => (
                        <li key={index}>
                          <a href={ref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
                ✓ Finding generated successfully! You can accept it or regenerate with different inputs.
              </p>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            className="text-on-surface-variant"
          >
            Cancel
          </Button>
          
          {step === 'evidence' && (
            <Button
              type="button"
              onClick={handleCreateDraft}
              disabled={loading || !formData.title || !formData.evidence}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                'Next: Upload Evidence'
              )}
            </Button>
          )}

          {step === 'generate' && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          )}

          {step === 'review' && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={loading}
                className="text-on-surface"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Accept & Save'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIGenerateDialog;
