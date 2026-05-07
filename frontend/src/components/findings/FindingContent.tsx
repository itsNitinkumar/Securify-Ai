import { useState } from 'react';
import { Finding, findingApi } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, X, AlertTriangle, Shield, FileText } from 'lucide-react';

interface FindingContentProps {
  finding: Finding;
  isEditing: boolean;
  onUpdate: () => void;
  onRegenerateSection: (section: string) => void;
}

const FindingContent = ({
  finding,
  isEditing,
  onUpdate,
  onRegenerateSection,
}: FindingContentProps) => {
  const [editData, setEditData] = useState({
    description: finding.description,
    affected_target: finding.affected_target || '',
    steps_to_reproduce: Array.isArray(finding.steps_to_reproduce)
      ? finding.steps_to_reproduce
      : finding.steps_to_reproduce ? [finding.steps_to_reproduce] : [],
    recommendation: finding.recommendation || [],
    remediation: finding.remediation || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any = {
        description: editData.description,
        affected_target: editData.affected_target,
        steps_to_reproduce: editData.steps_to_reproduce,
      };
      if (editData.recommendation && editData.recommendation.length > 0) {
        payload.recommendation = editData.recommendation;
      }
      if (editData.remediation) {
        payload.remediation = editData.remediation;
      }
      await findingApi.updateFinding(finding.id, payload);
      onUpdate();
    } catch (error) {
      console.error('Failed to update finding:', error);
      alert('Failed to update finding');
    } finally {
      setSaving(false);
    }
  };

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
      High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[severity] || colors.Low;
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Description
          </h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerateSection('description')}
              className="text-primary hover:text-primary/80"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Regenerate
            </Button>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        ) : (
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {finding.description}
          </p>
        )}
      </Card>

      {/* Affected Target */}
      {finding.affected_target && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <h3 className="text-sm font-semibold text-on-surface mb-2">Affected URL</h3>
          <p className="text-sm text-primary font-mono bg-surface p-3 rounded border border-outline-variant break-all">
            {finding.affected_target}
          </p>
        </Card>
      )}

      {/* Impact & Likelihood */}
      {(finding.impact || finding.likelihood) && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Impact &amp; Likelihood
            </h3>
            {!isEditing && (
              <div className="flex gap-2">
                {finding.impact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerateSection('impact')}
                    className="text-primary hover:text-primary/80"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate Impact
                  </Button>
                )}
                {finding.likelihood && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerateSection('likelihood')}
                    className="text-primary hover:text-primary/80"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate Likelihood
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            {finding.impact && (
              <div className="bg-surface p-4 rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-on-surface">Impact:</span>
                  {typeof finding.impact === 'object' && finding.impact.severity && (
                    <Badge className={severityBadge(finding.impact.severity)}>
                      {finding.impact.severity}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {typeof finding.impact === 'object' ? finding.impact.detail : finding.impact}
                </p>
              </div>
            )}
            {finding.likelihood && (
              <div className="bg-surface p-4 rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-on-surface">Likelihood:</span>
                  {typeof finding.likelihood === 'object' && finding.likelihood.severity && (
                    <Badge className={severityBadge(finding.likelihood.severity)}>
                      {finding.likelihood.severity}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {typeof finding.likelihood === 'object' ? finding.likelihood.detail : finding.likelihood}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Steps to Reproduce */}
      {(finding.steps_to_reproduce || isEditing) && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface">Steps to Reproduce</h3>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerateSection('steps_to_reproduce')}
                className="text-primary hover:text-primary/80"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Regenerate
              </Button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={Array.isArray(editData.steps_to_reproduce)
                ? editData.steps_to_reproduce.join('\n')
                : editData.steps_to_reproduce}
              onChange={(e) =>
                setEditData({ ...editData, steps_to_reproduce: e.target.value.split('\n') })
              }
              rows={6}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
            />
          ) : (
            <div className="space-y-3">
              {Array.isArray(finding.steps_to_reproduce) ? (
                finding.steps_to_reproduce.map((step, index) => (
                  <p key={index} className="text-sm text-on-surface-variant leading-relaxed">
                    <span className="font-semibold text-on-surface">Step {index + 1}:</span>{' '}
                    {step}
                  </p>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {finding.steps_to_reproduce}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Recommendations (AI array) */}
      {(finding.recommendation || isEditing) && (
        <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Recommendations
            </h3>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerateSection('recommendation')}
                className="text-primary hover:text-primary/80"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Regenerate
              </Button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={Array.isArray(editData.recommendation)
                ? editData.recommendation.join('\n\n')
                : editData.recommendation}
              onChange={(e) =>
                setEditData({ ...editData, recommendation: e.target.value.split('\n\n').filter((s) => s.trim()) })
              }
              rows={8}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          ) : (
            <ul className="space-y-3">
              {finding.recommendation?.map((rec, index) => {
                const match = rec.match(/^\*\*(.+?)\*\*:?\s*(.+)$/s);
                if (match) {
                  return (
                    <li key={index} className="flex items-start gap-3 text-sm text-on-surface-variant">
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="leading-relaxed">
                        <span className="font-semibold text-on-surface">{match[1]}:</span>{' '}
                        {match[2]}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={index} className="flex items-start gap-3 text-sm text-on-surface-variant">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* Remediation (legacy string) */}
      {finding.remediation && !finding.recommendation && (
        <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Remediation Strategy
            </h3>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerateSection('remediation')}
                className="text-primary hover:text-primary/80"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Regenerate
              </Button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editData.remediation}
              onChange={(e) => setEditData({ ...editData, remediation: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          ) : (
            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {finding.remediation}
            </p>
          )}
        </Card>
      )}

      {/* References */}
      {finding.references && finding.references.length > 0 && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <h3 className="text-sm font-semibold text-on-surface mb-4">References</h3>
          <div className="space-y-2">
            {finding.references.map((ref, index) => (
              <a
                key={index}
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline break-all"
              >
                {ref}
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-surface hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditData({
                description: finding.description,
                affected_target: finding.affected_target || '',
                steps_to_reproduce: Array.isArray(finding.steps_to_reproduce)
                  ? finding.steps_to_reproduce
                  : finding.steps_to_reproduce ? [finding.steps_to_reproduce] : [],
                recommendation: finding.recommendation || [],
                remediation: finding.remediation || '',
              });
            }}
            className="border-outline text-on-surface-variant"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default FindingContent;
