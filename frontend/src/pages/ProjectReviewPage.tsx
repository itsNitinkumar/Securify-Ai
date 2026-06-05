import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  Shield,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { projectApi } from '@/api/projectApi';
import { evidenceApi, Evidence } from '@/api/evidenceApi';
import { CommentThread } from '@/api/commentThreadApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InlineConfirm from '@/components/ui/inline-confirm';
import ReviewSection from '@/components/comments/ReviewSection';
import RightCommentPanel from '@/components/comments/RightCommentPanel';
import SectionEditModal from '@/components/comments/SectionEditModal';
import { useAuth } from '@/contexts/AuthContext';
import { templateKeyFromProject } from '@/reportTemplates/registry';
import { findingApi } from '@/api/findingApi';

type ProjectBundle = {
  project: any;
  findings: any[];
  threads: CommentThread[];
};

const severityColors: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const projectStatusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pending_comment_resolution: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'pending_review': return 'Pending Review';
    case 'pending_comment_resolution': return 'Changes Requested';
    case 'completed': return 'Completed';
    default: return 'Draft';
  }
};

const isFalsePositive = (f: any) => f?.finding_type === 'false_positive';

const sectionKeyOf = (prefix: string, key: string) => `${prefix}::${key}`;

const ProjectReviewPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceByFinding, setEvidenceByFinding] = useState<Record<number, Evidence[]>>({});
  const [activeSection, setActiveSection] = useState<{
    key: string;
    label: string;
    sectionType: string;
    sectionKey: string;
    findingId?: number;
  } | null>(null);
  const [editingSection, setEditingSection] = useState<{
    key: string;
    label: string;
    sectionType: string;
    sectionKey: string;
    findingId: number;
    finding: any;
  } | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'complete' | 'changes' | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const refreshTimerRef = useRef<number | null>(null);

  const canApprove = hasPermission('approve_findings') || hasRole('manager', 'admin');
  const isReviewer = canApprove;
  const isClient = hasRole('client');
  const canComplete = hasRole('manager', 'admin');
  const canComment = !isClient;

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await projectApi.getReviewBundle(Number(projectId));
      const data = (res as any)?.data || res;
      setBundle(data);
    } catch (error) {
      console.error('Failed to load review bundle:', error);
      toast.error('Failed to load project review');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!bundle) return;
    const fetchEvidence = async () => {
      const next: Record<number, Evidence[]> = {};
      for (const f of bundle.findings || []) {
        try {
          const res = await evidenceApi.getByFinding(f.id);
          const list = (res as any)?.data?.data || (res as any)?.data || [];
          next[f.id] = Array.isArray(list) ? list : [];
        } catch {
          next[f.id] = [];
        }
      }
      setEvidenceByFinding(next);
    };
    fetchEvidence();
  }, [bundle]);

  const project = bundle?.project;
  const findings = bundle?.findings || [];
  const threads = bundle?.threads || [];

  const isEditableStatus = project?.status === 'draft' || project?.status === 'pending_comment_resolution';
  const canEditSection = hasPermission('edit_findings') && isEditableStatus;

  const findingsList = useMemo(() => bundle?.findings || [], [bundle?.findings]);

  const threadsBySection = useMemo(() => {
    const map: Record<string, CommentThread[]> = {};
    threads.forEach((t) => {
      const key = sectionKeyOf(t.section_type, t.finding_id ? `${t.finding_id}::${t.section_key}` : t.section_key);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [threads]);

  const getFindingSectionThreads = (findingId: number, sectionKey: string) =>
    threadsBySection[`finding::${findingId}::${sectionKey}`] || [];

  const handleSelectSection = useCallback(
    (sectionType: string, sectionKey: string, label: string, findingId?: number) => {
      setActiveSection({ key: `${sectionType}-${findingId || 0}-${sectionKey}`, label, sectionType, sectionKey, findingId });
    },
    []
  );

  const handleEditSection = useCallback(
    (sectionType: string, sectionKey: string, label: string, findingId: number) => {
      const f = findingsList.find((x: any) => x.id === findingId);
      if (!f) return;
      setEditingSection({
        key: `${sectionType}-${findingId}-${sectionKey}`,
        label,
        sectionType,
        sectionKey,
        findingId,
        finding: f,
      });
    },
    [findingsList]
  );

  const handleSaveEdit = useCallback(
    async (patch: Record<string, any>) => {
      if (!editingSection) return;
      try {
        await findingApi.update(editingSection.findingId, patch);
        toast.success('Section updated');
        setEditingSection(null);
        load();
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to save changes';
        toast.error(message);
      }
    },
    [editingSection, load]
  );

  const handleThreadsChanged = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      load();
    }, 500);
  }, [load]);

  const findingDisplayId = useCallback(
    (id: number) => {
      const idx = findingsList.findIndex((x: any) => x.id === id);
      return idx >= 0 ? idx + 1 : id;
    },
    [findingsList]
  );

  const totalOpenThreads = threads.filter((t) => t.status === 'OPEN' || t.status === 'REOPENED').length;
  const totalResolvedThreads = threads.filter((t) => t.status === 'RESOLVED').length;
  const findingsWithOpenThreads = useMemo(() => {
    const ids = new Set<number>();
    threads.forEach((t) => {
      if (t.finding_id && (t.status === 'OPEN' || t.status === 'REOPENED')) {
        ids.add(t.finding_id);
      }
    });
    return ids;
  }, [threads]);

  const getSectionBorder = useCallback(
    (findingId: number, sectionKey: string) => {
      const secThreads = getFindingSectionThreads(findingId, sectionKey);
      const open = secThreads.filter((t) => t.status === 'OPEN' || t.status === 'REOPENED').length;
      const resolved = secThreads.filter((t) => t.status === 'RESOLVED').length;
      if (open > 0) return 'border-orange-500/60';
      if (resolved > 0) return 'border-green-500/40';
      return 'border-outline';
    },
    [getFindingSectionThreads]
  );

  const handleAction = async (action: 'changes' | 'complete') => {
    if (!projectId) return;
    try {
      setWorkflowLoading(true);
      if (action === 'changes') {
        await projectApi.requestChanges(Number(projectId));
        toast.success('Changes requested');
      } else {
        await projectApi.markComplete(Number(projectId));
        toast.success('Project marked complete');
      }
      setShowConfirm(null);
      load();
    } catch (error: any) {
      const message = error?.response?.data?.message || `Failed to ${action === 'changes' ? 'request changes' : 'mark complete'}`;
      toast.error(message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const renderImpactLikelihood = (f: any) => {
    const impact: any = f.impact;
    const likelihood: any = f.likelihood;
    const renderSide = (label: string, value: any) => {
      if (!value) return null;
      const sev = typeof value === 'object' ? value.severity : null;
      const detail = typeof value === 'object' ? value.detail : value;
      if (!sev && !detail) return null;
      return (
        <div className="bg-surface p-4 rounded-lg border border-outline-variant">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-on-surface">{label}:</span>
            {sev ? (
              <Badge className={severityColors[sev] || severityColors.Low}>{sev}</Badge>
            ) : null}
          </div>
          {detail ? (
            <p className="text-sm text-on-surface-variant leading-relaxed">{detail}</p>
          ) : null}
        </div>
      );
    };
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSide('Impact', impact)}
        {renderSide('Likelihood', likelihood)}
      </div>
    );
  };

  const renderSteps = (f: any) => {
    const steps = f.steps_to_reproduce;
    if (!Array.isArray(steps) || steps.length === 0) {
      return <p className="text-sm text-on-surface-variant">No steps documented.</p>;
    }
    return (
      <div className="space-y-4">
        {steps.map((step: any, index: number) => {
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
              {imageUrl ? (
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
                  {step.caption ? (
                    <p className="text-xs text-on-surface-variant mt-2 italic text-center">{step.caption}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRecommendations = (f: any) => {
    const recs = Array.isArray(f.recommendation) ? f.recommendation : [];
    if (recs.length === 0) {
      return <p className="text-sm text-on-surface-variant">No recommendations.</p>;
    }
    return (
      <ul className="space-y-3">
        {recs.map((rec: string, index: number) => {
          const match = rec.match(/^\*\*(.+?)\*\*:?\s*(.+)$/s);
          if (match) {
            return (
              <li key={index} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="leading-relaxed">
                  <span className="font-semibold text-on-surface">{match[1]}:</span> {match[2]}
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
    );
  };

  const renderEvidence = (f: any) => {
    const fetched = evidenceByFinding[f.id];
    const inline = Array.isArray(f.evidence_items) ? f.evidence_items : [];
    const items =
      fetched !== undefined && fetched.length > 0 ? fetched : inline;
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="text-sm text-on-surface-variant">No evidence uploaded.</p>;
    }
    return (
      <div className="space-y-3">
        {items.map((item: any, idx: number) => {
          const imageUrl = item.signedUrl || item.url || item.imageKey;
          return (
            <div key={idx} className="bg-surface-low p-3 rounded border border-outline-variant">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Evidence ${idx + 1}`}
                  className="w-full max-h-80 object-contain rounded border border-outline bg-surface"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              {item.caption ? (
                <p className="text-xs text-on-surface-variant mt-2 italic text-center">{item.caption}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderReferences = (f: any) => {
    const refs = Array.isArray(f.references) ? f.references : [];
    if (refs.length === 0) {
      return <p className="text-sm text-on-surface-variant">No references.</p>;
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {refs.map((ref: string, index: number) => (
          <li key={index} className="text-sm text-primary break-all">
            <a href={ref} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {ref}
            </a>
          </li>
        ))}
      </ul>
    );
  };

  const projectTemplateKey = useMemo(
    () => (project ? templateKeyFromProject(project) : 'unknown'),
    [project]
  );

  if (loading && !bundle) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-on-surface-variant">Loading project review…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-on-surface-variant">Project not found.</div>
      </div>
    );
  }

  const isDast = projectTemplateKey === 'dast';
  const truePositive = findings.filter((f: any) => f.finding_type !== 'false_positive');
  const falsePositive = findings.filter((f: any) => f.finding_type === 'false_positive');

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-30 bg-surface-low/95 backdrop-blur border-b border-outline">
        <div className="px-4 md:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}`)}
              className="text-on-surface-variant hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Badge className={`text-xs ${projectStatusColors[project.status] || projectStatusColors.draft}`}>
              {getStatusLabel(project.status)}
            </Badge>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
              Review Mode
            </Badge>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{totalOpenThreads} open</span>
              <span className="text-on-surface-variant/50">·</span>
              <span className="text-green-400">{totalResolvedThreads} resolved</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isReviewer && project.status === 'pending_review' && (
              <>
                {showConfirm === 'changes' ? (
                  <InlineConfirm
                    danger
                    title="Request changes?"
                    description="The reporter will need to address comments and re-submit."
                    confirmText="Request"
                    busy={workflowLoading}
                    onCancel={() => setShowConfirm(null)}
                    onConfirm={() => void handleAction('changes')}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm('changes')}
                    disabled={workflowLoading}
                    className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Changes
                  </Button>
                )}
                {showConfirm === 'complete' ? (
                  <InlineConfirm
                    title="Mark project complete?"
                    description="The project will be locked and no further edits are allowed."
                    confirmText="Mark Complete"
                    busy={workflowLoading}
                    onCancel={() => setShowConfirm(null)}
                    onConfirm={() => void handleAction('complete')}
                  />
                ) : canComplete ? (
                  <Button
                    size="sm"
                    onClick={() => setShowConfirm('complete')}
                    disabled={workflowLoading}
                    className="bg-green-500 text-surface hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                ) : null}
              </>
            )}
            {isReviewer && project.status === 'pending_comment_resolution' && canComplete && (
              showConfirm === 'complete' ? (
                <InlineConfirm
                  title="Mark project complete?"
                  description="The project will be locked and no further edits are allowed."
                  confirmText="Mark Complete"
                  busy={workflowLoading}
                  onCancel={() => setShowConfirm(null)}
                  onConfirm={() => void handleAction('complete')}
                />
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowConfirm('complete')}
                  disabled={workflowLoading}
                  className="bg-green-500 text-surface hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center gap-2">
          {findings.length > 0 ? (
            <>
              <span className="text-xs text-on-surface-variant">JUMP TO:</span>
              {findings.map((f: any, idx: number) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const el = sectionRefs.current[`finding-${f.id}`];
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-2 py-1 text-xs rounded border border-outline hover:border-primary hover:text-primary text-on-surface-variant"
                >
                  F{idx + 1}
                </button>
              ))}
            </>
          ) : null}
        </div>

        {findings.length === 0 ? (
          <Card className="p-8 text-center bg-surface-high border-outline">
            <p className="text-on-surface-variant">No findings to review for this project yet.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {isDast ? (
              <>
                {truePositive.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-on-surface-variant">
                      True Positive ({truePositive.length})
                    </h3>
                    {truePositive.map((f: any) => renderFinding(f))}
                  </div>
                ) : null}
                {falsePositive.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-on-surface-variant">
                      False Positive ({falsePositive.length})
                    </h3>
                    {falsePositive.map((f: any) => renderFinding(f))}
                  </div>
                ) : null}
              </>
            ) : (
              findings.map((f: any) => renderFinding(f))
            )}
          </div>
        )}

        {/* Review Summary */}
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-on-surface">Review Summary</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface p-3 rounded border border-outline-variant">
              <div className="text-xs text-on-surface-variant">Total findings</div>
              <div className="text-2xl font-bold text-on-surface font-technical">{findings.length}</div>
            </div>
            <div className="bg-surface p-3 rounded border border-outline-variant">
              <div className="text-xs text-on-surface-variant">Open comments</div>
              <div className="text-2xl font-bold text-orange-400 font-technical">{totalOpenThreads}</div>
            </div>
            <div className="bg-surface p-3 rounded border border-outline-variant">
              <div className="text-xs text-on-surface-variant">Findings w/ open</div>
              <div className="text-2xl font-bold text-on-surface font-technical">
                {findingsWithOpenThreads.size}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {activeSection ? (
        <RightCommentPanel
          projectId={project.id}
          findingId={activeSection.findingId}
          sectionType={activeSection.sectionType}
          sectionKey={activeSection.sectionKey}
          sectionLabel={activeSection.label}
          threads={
            activeSection.findingId
              ? threads.filter(
                  (t) =>
                    t.finding_id === activeSection.findingId &&
                    t.section_key === activeSection.sectionKey
                )
              : threads.filter((t) => t.section_key === activeSection.sectionKey && !t.finding_id)
          }
          open={!!activeSection}
          onClose={() => setActiveSection(null)}
          onThreadsChanged={handleThreadsChanged}
        />
      ) : null}

      {activeSection ? (
        <button
          type="button"
          onClick={() => setActiveSection(null)}
          className="fixed inset-0 bg-black/30 z-30"
          aria-label="Dismiss comments panel"
        />
      ) : null}

      {editingSection ? (
        <SectionEditModal
          open={!!editingSection}
          sectionKey={editingSection.sectionKey}
          sectionLabel={editingSection.label}
          finding={editingSection.finding}
          onClose={() => setEditingSection(null)}
          onSave={handleSaveEdit}
        />
      ) : null}
    </div>
  );

  function renderFinding(f: any) {
    const fp = isFalsePositive(f);
    const displayId = findingDisplayId(f.id);
    return (
      <div
        key={f.id}
        ref={(el) => { sectionRefs.current[`finding-${f.id}`] = el; }}
        className="space-y-3"
      >
        <Card className="p-3 sm:p-4 bg-surface border-outline flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {fp ? (
              <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                False Positive
              </Badge>
            ) : (
              <Badge className={`text-xs ${severityColors[f.severity] || severityColors.Low}`}>
                {f.severity}
              </Badge>
            )}
            <h3 className="text-sm font-semibold text-on-surface truncate">
              <span className="text-on-surface-variant mr-2">#{displayId}</span>
              {f.title}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/findings/${f.id}`)}
              className="text-primary hover:text-primary/80 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          <ReviewSection
            sectionKey={`finding-${f.id}-description`}
            label="Description"
            icon={<FileText className="w-3.5 h-3.5" />}
            borderClass={getSectionBorder(f.id, 'description')}
            isActive={activeSection?.key === `finding-${f.id}-description`}
            onSelect={() => handleSelectSection('finding', 'description', `Finding #${displayId} · Description`, f.id)}
            onEdit={() => handleEditSection('finding', 'description', 'Description', f.id)}
            canEdit={canEditSection}
            showAddComment={canComment}
          >
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
              {f.description || 'No description.'}
            </p>
          </ReviewSection>

          <ReviewSection
            sectionKey={`finding-${f.id}-affected_urls`}
            label="Affected URLs"
            borderClass={getSectionBorder(f.id, 'affected_urls')}
            isActive={activeSection?.key === `finding-${f.id}-affected_urls`}
            onSelect={() => handleSelectSection('finding', 'affected_urls', `Finding #${displayId} · Affected URLs`, f.id)}
            onEdit={() => handleEditSection('finding', 'affected_urls', 'Affected URLs', f.id)}
            canEdit={canEditSection}
            showAddComment={canComment}
          >
            {Array.isArray(f.affected_target) && f.affected_target.length > 0 ? (
              <div className="space-y-1">
                {f.affected_target.map((u: string, i: number) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline break-all">
                    {u}
                  </a>
                ))}
              </div>
            ) : f.affected_target ? (
              <a href={f.affected_target} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline break-all">
                {f.affected_target}
              </a>
            ) : (
              <p className="text-sm text-on-surface-variant">No URLs added.</p>
            )}
          </ReviewSection>

          {/* True positive-only sections */}
          {!fp && (f.impact || f.likelihood) && (
            <ReviewSection
              sectionKey={`finding-${f.id}-impact_likelihood`}
              label="Impact & Likelihood"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              borderClass={getSectionBorder(f.id, 'impact_likelihood')}
              isActive={activeSection?.key === `finding-${f.id}-impact_likelihood`}
              onSelect={() => handleSelectSection('finding', 'impact_likelihood', `Finding #${displayId} · Impact & Likelihood`, f.id)}
              onEdit={() => handleEditSection('finding', 'impact_likelihood', 'Impact & Likelihood', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              {renderImpactLikelihood(f)}
            </ReviewSection>
          )}

          {!fp && (f.steps_to_reproduce) && (
            <ReviewSection
              sectionKey={`finding-${f.id}-steps`}
              label="Steps to Reproduce"
              borderClass={getSectionBorder(f.id, 'steps_to_reproduce')}
              isActive={activeSection?.key === `finding-${f.id}-steps`}
              onSelect={() => handleSelectSection('finding', 'steps_to_reproduce', `Finding #${displayId} · Steps to Reproduce`, f.id)}
              onEdit={() => handleEditSection('finding', 'steps_to_reproduce', 'Steps to Reproduce', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              {renderSteps(f)}
            </ReviewSection>
          )}

          {!fp && (
            <ReviewSection
              sectionKey={`finding-${f.id}-recommendation`}
              label="Recommendations"
              icon={<Shield className="w-3.5 h-3.5" />}
              borderClass={getSectionBorder(f.id, 'recommendation')}
              isActive={activeSection?.key === `finding-${f.id}-recommendation`}
              onSelect={() => handleSelectSection('finding', 'recommendation', `Finding #${displayId} · Recommendations`, f.id)}
              onEdit={() => handleEditSection('finding', 'recommendation', 'Recommendations', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              {renderRecommendations(f)}
            </ReviewSection>
          )}

          {!fp && f.proof_of_concept && (
            <ReviewSection
              sectionKey={`finding-${f.id}-poc`}
              label="Proof of Concept"
              borderClass={getSectionBorder(f.id, 'proof_of_concept')}
              isActive={activeSection?.key === `finding-${f.id}-poc`}
              onSelect={() => handleSelectSection('finding', 'proof_of_concept', `Finding #${displayId} · Proof of Concept`, f.id)}
              onEdit={() => handleEditSection('finding', 'proof_of_concept', 'Proof of Concept', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono bg-surface-low p-3 rounded border border-outline-variant overflow-x-auto">
                {f.proof_of_concept}
              </pre>
            </ReviewSection>
          )}

          {fp && (
            <ReviewSection
              sectionKey={`finding-${f.id}-evidence`}
              label="Evidence"
              icon={<ImageIcon className="w-3.5 h-3.5" />}
              borderClass={getSectionBorder(f.id, 'evidence')}
              isActive={activeSection?.key === `finding-${f.id}-evidence`}
              onSelect={() => handleSelectSection('finding', 'evidence', `Finding #${displayId} · Evidence`, f.id)}
              onEdit={() => handleEditSection('finding', 'evidence', 'Evidence', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              {renderEvidence(f)}
            </ReviewSection>
          )}

          {!fp && (
            <ReviewSection
              sectionKey={`finding-${f.id}-references`}
              label="References"
              borderClass={getSectionBorder(f.id, 'references')}
              isActive={activeSection?.key === `finding-${f.id}-references`}
              onSelect={() => handleSelectSection('finding', 'references', `Finding #${displayId} · References`, f.id)}
              onEdit={() => handleEditSection('finding', 'references', 'References', f.id)}
              canEdit={canEditSection}
              showAddComment={canComment}
            >
              {renderReferences(f)}
            </ReviewSection>
          )}
        </div>
      </div>
    );
  }
};

export default ProjectReviewPage;
