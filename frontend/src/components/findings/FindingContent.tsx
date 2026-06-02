import { useState } from 'react';
import { Finding, findingApi } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, X, AlertTriangle, Shield, FileText, Plus } from 'lucide-react';
import StepEditor from './StepEditor';
import EvidenceItemEditor from './EvidenceItemEditor';
import CommentableSection from '@/components/comments/CommentableSection';

const findingSeverities = ['Critical', 'High', 'Medium', 'Low', 'Informational'] as const;
const riskSeverities = ['High', 'Medium', 'Low'] as const;

interface FindingContentProps {
  finding: Finding;
  isEditing: boolean;
  onUpdate: () => void;
  onRegenerateSection: (section: string) => void;
  onCancelEdit?: () => void;
}

interface Step {
  stepNumber: number;
  description: string;
  image?: string;
  caption?: string;
}

const normalizeSteps = (steps: any): Step[] => {
  if (!steps) return [];
  if (!Array.isArray(steps)) return [];
  return steps.map((step: any, index: number) => {
    if (typeof step === 'object' && step !== null) {
      return {
        stepNumber: step.stepNumber || index + 1,
        description: step.description || '',
        imageKey: step.imageKey || '',
        caption: step.caption || '',
      };
    }
    return {
      stepNumber: index + 1,
      description: String(step),
      image: '',
      caption: '',
    };
  });
};

const isFalsePositive = (finding: Finding) =>
  (finding as any).finding_type === 'false_positive';

const FindingContent = ({
  finding,
  isEditing,
  onUpdate,
  onRegenerateSection,
  onCancelEdit,
}: FindingContentProps) => {
    const [editData, setEditData] = useState({
      severity: finding.severity,
      description: finding.description,
      affected_target: Array.isArray(finding.affected_target) ? finding.affected_target : (finding.affected_target ? [finding.affected_target] : []),
      steps_to_reproduce: normalizeSteps(finding.steps_to_reproduce),
      recommendation: finding.recommendation || [],
      remediation: finding.remediation || '',
      impact_severity: (typeof finding.impact === 'object' ? finding.impact?.severity : '') || '',
      impact_detail: (typeof finding.impact === 'object' ? finding.impact?.detail : '') || (typeof finding.impact === 'string' ? finding.impact : ''),
      likelihood_severity: (typeof finding.likelihood === 'object' ? finding.likelihood?.severity : '') || '',
      likelihood_detail: (typeof finding.likelihood === 'object' ? finding.likelihood?.detail : '') || (typeof finding.likelihood === 'string' ? finding.likelihood : ''),
      evidence_items: (finding as any).evidence_items || [],
      references: finding.references || [],
    });
  const [saving, setSaving] = useState(false);
  const handleStepsChange = (steps: Step[]) => {
    const renumberedSteps = steps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));
    setEditData((prev) => ({ ...prev, steps_to_reproduce: renumberedSteps }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any = {
        severity: editData.severity,
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
      if (editData.impact_detail || editData.impact_severity) {
        payload.impact = editData.impact_severity
          ? { severity: editData.impact_severity, detail: editData.impact_detail }
          : editData.impact_detail;
      }
      if (editData.likelihood_detail || editData.likelihood_severity) {
        payload.likelihood = editData.likelihood_severity
          ? { severity: editData.likelihood_severity, detail: editData.likelihood_detail }
          : editData.likelihood_detail;
      }
      if (isFalsePositive(finding) && editData.evidence_items) {
        payload.evidence_items = editData.evidence_items;
      }
      if (editData.affected_target && editData.affected_target.length > 0) {
        payload.affected_target = editData.affected_target;
      }
      if (editData.references && editData.references.length > 0) {
        payload.references = editData.references;
      } else {
        payload.references = [];
      }
      await findingApi.updateFinding(finding.id, payload);
      onUpdate();
      if (onCancelEdit) {
        onCancelEdit();
      }
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
      {/* Severity - hide for false positives */}
      {isEditing && !isFalsePositive(finding) && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Severity</h3>
          <select
            value={editData.severity}
            onChange={(e) => setEditData({ ...editData, severity: e.target.value as Finding['severity'] })}
            className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {findingSeverities.map((sev) => (
              <option key={sev} value={sev}>{sev}</option>
            ))}
          </select>
        </Card>
      )}

      {/* Description */}
      <CommentableSection
        projectId={finding.project_id!}
        findingId={finding.id}
        sectionType="finding"
        sectionKey="description"
        label="Description"
        icon={<FileText className="w-4 h-4" />}
        className="p-4 md:p-6 bg-surface-high border-outline"
        actions={!isEditing ? <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('description')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />AI Regenerate</Button> : undefined}
      >
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
      </CommentableSection>

       {/* Affected Target / URLs */}
       {isEditing || (finding.affected_target && finding.affected_target.length > 0) ? (
         <CommentableSection
           projectId={finding.project_id!}
           findingId={finding.id}
           sectionType="finding"
           sectionKey="affected_urls"
           label="Affected URLs"
           className="p-4 md:p-6 bg-surface-high border-outline"
         >
           {isEditing ? (
             <div className="space-y-3">
               {editData.affected_target.map((url, index) => (
                 <div key={index} className="flex items-center gap-2">
                   <input
                     value={url}
                     onChange={(e) => {
                       const updated = [...editData.affected_target];
                       updated[index] = e.target.value;
                       setEditData({ ...editData, affected_target: updated });
                     }}
                     placeholder="https://example.com/api/login"
                     className="flex-1 px-3 py-2 bg-surface border border-outline rounded-md text-on-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                   />
                   <button
                     type="button"
                     onClick={() => {
                       const updated = editData.affected_target.filter((_, i) => i !== index);
                       setEditData({ ...editData, affected_target: updated });
                     }}
                     className="text-error hover:text-error/80 text-sm px-2 py-1"
                   >
                     Remove
                   </button>
                 </div>
               ))}
               <button
                 type="button"
                 onClick={() => {
                   setEditData({ ...editData, affected_target: [...editData.affected_target, ''] });
                 }}
                 className="text-sm text-primary hover:text-primary/80"
               >
                 + Add URL
               </button>
             </div>
           ) : (
             <div className="space-y-2">
               {Array.isArray(finding.affected_target) 
                 ? finding.affected_target.map((url, index) => (
                   <a
                     key={index}
                     href={url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block text-sm text-primary hover:underline break-all"
                   >
                     {url}
                   </a>
                 )) 
                 : (finding.affected_target ? [
                     <a
                       key="0"
                       href={finding.affected_target}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="block text-sm text-primary hover:underline break-all"
                     >
                       {finding.affected_target}
                     </a>
                   ] : [])}
             </div>
            )}
          </CommentableSection>
        ) : (
          <CommentableSection
            projectId={finding.project_id!}
            findingId={finding.id}
            sectionType="finding"
            sectionKey="affected_urls"
            label="Affected URLs"
            className="p-4 md:p-6 bg-surface-high border-outline"
          >
            <p className="text-sm text-on-surface-variant">No URLs added yet.</p>
          </CommentableSection>
        )}

      {/* Impact & Likelihood - hide for false positives */}
      {!isFalsePositive(finding) && (finding.impact || finding.likelihood || isEditing) && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="impact_likelihood"
          label="Impact & Likelihood"
          icon={<AlertTriangle className="w-4 h-4" />}
          className="p-4 md:p-6 bg-surface-high border-outline"
          actions={!isEditing ? <div className="flex gap-2">{finding.impact && <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('impact')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />Regenerate Impact</Button>}{finding.likelihood && <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('likelihood')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />Regenerate Likelihood</Button>}</div> : undefined}
        >
          <div className="space-y-4">
            {(finding.impact || isEditing) && (
              <div className="bg-surface p-4 rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-on-surface">Impact:</span>
                  {!isEditing && typeof finding.impact === 'object' && finding.impact.severity && (
                    <Badge className={severityBadge(finding.impact.severity)}>
                      {finding.impact.severity}
                    </Badge>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <select
                      value={editData.impact_severity}
                      onChange={(e) => setEditData({ ...editData, impact_severity: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select severity...</option>
                      {riskSeverities.map((sev) => (
                        <option key={sev} value={sev}>{sev}</option>
                      ))}
                    </select>
                    <textarea
                      value={editData.impact_detail}
                      onChange={(e) => setEditData({ ...editData, impact_detail: e.target.value })}
                      rows={3}
                      placeholder="Impact detail..."
                      className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {typeof finding.impact === 'object' ? finding.impact.detail : finding.impact}
                  </p>
                )}
              </div>
            )}
            {(finding.likelihood || isEditing) && (
              <div className="bg-surface p-4 rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-on-surface">Likelihood:</span>
                  {!isEditing && typeof finding.likelihood === 'object' && finding.likelihood.severity && (
                    <Badge className={severityBadge(finding.likelihood.severity)}>
                      {finding.likelihood.severity}
                    </Badge>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <select
                      value={editData.likelihood_severity}
                      onChange={(e) => setEditData({ ...editData, likelihood_severity: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select severity...</option>
                      {riskSeverities.map((sev) => (
                        <option key={sev} value={sev}>{sev}</option>
                      ))}
                    </select>
                    <textarea
                      value={editData.likelihood_detail}
                      onChange={(e) => setEditData({ ...editData, likelihood_detail: e.target.value })}
                      rows={3}
                      placeholder="Likelihood detail..."
                      className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {typeof finding.likelihood === 'object' ? finding.likelihood.detail : finding.likelihood}
                  </p>
                )}
              </div>
            )}
          </div>
        </CommentableSection>
      )}

      {/* Steps to Reproduce - for true positive findings */}
      {!isFalsePositive(finding) && (finding.steps_to_reproduce || isEditing) && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="steps_to_reproduce"
          label="Steps to Reproduce"
          className="p-4 md:p-6 bg-surface-high border-outline"
          actions={!isEditing ? <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('steps_to_reproduce')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />AI Regenerate</Button> : undefined}
        >
          {isEditing ? (
            <StepEditor
              steps={editData.steps_to_reproduce}
              onChange={handleStepsChange}
            />
          ) : (
            <div className="space-y-4">
              {Array.isArray(finding.steps_to_reproduce) ? (
                finding.steps_to_reproduce.map((step: any, index: number) => {
                  const isNewFormat = typeof step === 'object' && step !== null;
                  const imageUrl = isNewFormat ? (step.signedUrl || step.imageKey) : '';
                  
                  return (
                    <div key={index} className="bg-surface-low p-4 rounded-lg border border-outline-variant space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                          Step {isNewFormat ? step.stepNumber : index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {isNewFormat ? step.description : step}
                      </p>
                      {imageUrl && (
                        <div className="mt-2">
                          <img 
                            src={imageUrl} 
                            alt={`Step ${isNewFormat ? step.stepNumber : index + 1}`} 
                            className="w-full max-h-80 object-contain rounded-lg border border-outline-variant bg-surface" 
                            onError={(e) => {
                              console.error('Image failed to load:', imageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {step.caption && (
                            <p className="text-xs text-gray-400 mt-2 italic text-center">{step.caption}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {finding.steps_to_reproduce}
                </p>
              )}
            </div>
          )}
        </CommentableSection>
      )}

      {/* Evidence Items - for false positive findings */}
      {isFalsePositive(finding) && ((finding as any).evidence_items?.length > 0 || isEditing) && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="evidence_items"
          label="Evidence Items"
          className="p-4 md:p-6 bg-surface-high border-outline"
        >
          {isEditing ? (
            <div className="text-sm text-on-surface-variant">
              <EvidenceItemEditor
                items={editData.evidence_items || []}
                onChange={(items) => setEditData({ ...editData, evidence_items: items })}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {((finding as any).evidence_items || []).map((item: any, index: number) => {
                const imageUrl = item.signedUrl || item.imageKey;
                return (
                  <div key={index} className="bg-surface-low p-4 rounded-lg border border-outline-variant space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        Evidence #{index + 1}
                      </span>
                    </div>
                    {imageUrl && (
                      <div className="mt-2">
                        <img
                          src={imageUrl}
                          alt={`Evidence ${index + 1}`}
                          className="w-full max-h-80 object-contain rounded-lg border border-outline-variant bg-surface"
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {item.caption && (
                          <p className="text-xs text-gray-400 mt-2 italic text-center">{item.caption}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CommentableSection>
      )}

      {/* Recommendations (AI array) - View Mode Only (hide for false positives) */}
      {!isFalsePositive(finding) && finding.recommendation && !isEditing && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="recommendation"
          label="Recommendations"
          icon={<Shield className="w-4 h-4" />}
          className="p-4 md:p-6 bg-surface-high border-primary/20"
          actions={<Button variant="ghost" size="sm" onClick={() => onRegenerateSection('recommendation')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />AI Regenerate</Button>}
        >
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
        </CommentableSection>
      )}

      {/* Recommendations - Edit Mode (hide for false positives) */}
      {isEditing && !isFalsePositive(finding) && (
        <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Recommendations
            </h3>
          </div>
          <div className="space-y-3">
            {editData.recommendation.map((rec, index) => {
              const match = rec.match(/^\*\*(.+?)\*\*:?\s*(.+)$/s);
              return (
                <div key={index} className="flex items-start gap-3">
                  <span className="mt-3 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={match ? match[1] : rec.split(':')[0]}
                      onChange={(e) => {
                        const newRecs = [...editData.recommendation];
                        if (match) {
                          newRecs[index] = `**${e.target.value}:** ${match[2]}`;
                        } else {
                          const parts = rec.split(':');
                          parts[0] = e.target.value;
                          newRecs[index] = parts.join(':');
                        }
                        setEditData({ ...editData, recommendation: newRecs });
                      }}
                      className="w-full px-2 py-1 bg-surface border border-outline rounded text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Category"
                    />
                    <textarea
                      value={match ? match[2] : rec.split(':').slice(1).join(':')}
                      onChange={(e) => {
                        const newRecs = [...editData.recommendation];
                        if (match) {
                          newRecs[index] = `**${match[1]}:** ${e.target.value}`;
                        } else {
                          const parts = rec.split(':');
                          parts.splice(1).join(':').length;
                          newRecs[index] = `${parts[0]}: ${e.target.value}`;
                        }
                        setEditData({ ...editData, recommendation: newRecs });
                      }}
                      rows={2}
                      className="w-full mt-1 px-2 py-1 bg-surface border border-outline rounded text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Description"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newRecs = editData.recommendation.filter((_, i) => i !== index);
                      setEditData({ ...editData, recommendation: newRecs });
                    }}
                    className="text-error hover:bg-error/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditData({
                  ...editData,
                  recommendation: [...editData.recommendation, '**New Category:** Description']
                });
              }}
              className="text-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Recommendation
            </Button>
          </div>
        </Card>
      )}

      {/* Remediation (legacy string) */}
      {finding.remediation && !finding.recommendation && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="remediation"
          label="Remediation Strategy"
          icon={<Shield className="w-4 h-4" />}
          className="p-4 md:p-6 bg-surface-high border-primary/20"
          actions={!isEditing ? <Button variant="ghost" size="sm" onClick={() => onRegenerateSection('remediation')} className="text-primary hover:text-primary/80"><Sparkles className="w-4 h-4 mr-2" />AI Regenerate</Button> : undefined}
        >
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
        </CommentableSection>
      )}

      {/* References (hide for false positives) */}
      {!isFalsePositive(finding) && (isEditing || (finding.references && finding.references.length > 0)) && (
        <CommentableSection
          projectId={finding.project_id!}
          findingId={finding.id}
          sectionType="finding"
          sectionKey="references"
          label="References"
          className="p-4 md:p-6 bg-surface-high border-outline"
        >
          {isEditing ? (
            <div className="space-y-3">
              {editData.references.map((ref, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={ref}
                    onChange={(e) => {
                      const updated = [...editData.references];
                      updated[index] = e.target.value;
                      setEditData({ ...editData, references: updated });
                    }}
                    placeholder="https://example.com/vulnerability-reference"
                    className="flex-1 px-3 py-2 bg-surface border border-outline rounded-md text-on-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = editData.references.filter((_, i) => i !== index);
                      setEditData({ ...editData, references: updated });
                    }}
                    className="text-error hover:text-error/80 text-sm px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditData({ ...editData, references: [...editData.references, ''] });
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Add Reference
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(finding.references ?? []).map((ref, index) => (
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
          )}
        </CommentableSection>
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
                 severity: finding.severity,
                 description: finding.description,
                 steps_to_reproduce: normalizeSteps(finding.steps_to_reproduce),
                 recommendation: finding.recommendation || [],
                 remediation: finding.remediation || '',
                 impact_severity: (typeof finding.impact === 'object' ? finding.impact?.severity : '') || '',
                 impact_detail: (typeof finding.impact === 'object' ? finding.impact?.detail : '') || (typeof finding.impact === 'string' ? finding.impact : ''),
                 likelihood_severity: (typeof finding.likelihood === 'object' ? finding.likelihood?.severity : '') || '',
                 likelihood_detail: (typeof finding.likelihood === 'object' ? finding.likelihood?.detail : '') || (typeof finding.likelihood === 'string' ? finding.likelihood : ''),
                 evidence_items: (finding as any).evidence_items || [],
                 references: finding.references || [],
                 affected_target: Array.isArray(finding.affected_target) ? finding.affected_target : (finding.affected_target ? [finding.affected_target] : []),
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
