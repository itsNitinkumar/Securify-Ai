import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StepEditor from '@/components/findings/StepEditor';
import EvidenceItemEditor from '@/components/findings/EvidenceItemEditor';

export interface SectionEditModalProps {
  open: boolean;
  sectionKey: string;
  sectionLabel: string;
  finding: any;
  onClose: () => void;
  onSave: (patch: Record<string, any>) => Promise<void> | void;
}

const SectionEditModal = ({
  open,
  sectionKey,
  sectionLabel,
  finding,
  onClose,
  onSave,
}: SectionEditModalProps) => {
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState<string>('');
  const [affectedUrlsText, setAffectedUrlsText] = useState<string>('');
  const [impactSeverity, setImpactSeverity] = useState<string>('');
  const [impactDetail, setImpactDetail] = useState<string>('');
  const [likelihoodSeverity, setLikelihoodSeverity] = useState<string>('');
  const [likelihoodDetail, setLikelihoodDetail] = useState<string>('');
  const [steps, setSteps] = useState<Array<{ stepNumber: number; description: string; imageKey?: string; caption?: string }>>([]);
  const [recommendationsText, setRecommendationsText] = useState<string>('');
  const [pocText, setPocText] = useState<string>('');
  const [evidence, setEvidence] = useState<Array<{ imageKey?: string; caption?: string }>>([]);
  const [referencesText, setReferencesText] = useState<string>('');

  useEffect(() => {
    if (!open || !finding) return;
    setDescription(finding.description || '');
    const urls = Array.isArray(finding.affected_target)
      ? finding.affected_target.join('\n')
      : (finding.affected_target || '');
    setAffectedUrlsText(urls);
    const impact = finding.impact && typeof finding.impact === 'object' ? finding.impact : null;
    setImpactSeverity(impact?.severity || '');
    setImpactDetail(impact?.detail || '');
    const likelihood = finding.likelihood && typeof finding.likelihood === 'object' ? finding.likelihood : null;
    setLikelihoodSeverity(likelihood?.severity || '');
    setLikelihoodDetail(likelihood?.detail || '');

    const rawSteps = Array.isArray(finding.steps_to_reproduce) ? finding.steps_to_reproduce : [];
    setSteps(
      rawSteps.length > 0
        ? rawSteps.map((s: any, i: number) =>
            typeof s === 'object' && s !== null
              ? {
                  stepNumber: s.stepNumber || i + 1,
                  description: s.description || '',
                  imageKey: s.imageKey || '',
                  caption: s.caption || '',
                }
              : { stepNumber: i + 1, description: String(s), imageKey: '', caption: '' }
          )
        : [{ stepNumber: 1, description: '', imageKey: '', caption: '' }]
    );

    const recs = Array.isArray(finding.recommendation) ? finding.recommendation.join('\n') : '';
    setRecommendationsText(recs);
    setPocText(finding.proof_of_concept || '');

    const rawEvidence = Array.isArray(finding.evidence_items) ? finding.evidence_items : [];
    setEvidence(
      rawEvidence.length > 0
        ? rawEvidence.map((e: any) => ({
            imageKey: e.imageKey || e.url || '',
            caption: e.caption || '',
          }))
        : []
    );

    const refs = Array.isArray(finding.references) ? finding.references.join('\n') : '';
    setReferencesText(refs);
  }, [open, finding]);

  if (!open) return null;

  const sectionBareKey = sectionKey.startsWith('finding-')
    ? sectionKey.split('-').slice(2).join('-')
    : sectionKey;

  const buildPatch = (): Record<string, any> => {
    switch (sectionBareKey) {
      case 'description':
        return { description };
      case 'affected_urls':
        return {
          affected_target: affectedUrlsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        };
      case 'impact_likelihood':
        return {
          impact: impactSeverity || impactDetail
            ? { severity: impactSeverity || null, detail: impactDetail || null }
            : null,
          likelihood: likelihoodSeverity || likelihoodDetail
            ? { severity: likelihoodSeverity || null, detail: likelihoodDetail || null }
            : null,
        };
      case 'steps':
      case 'steps_to_reproduce':
        return {
          steps_to_reproduce: steps
            .filter((s) => (s.description || '').trim() !== '' || (s.imageKey || '').trim() !== '')
            .map((s, i) => ({
              stepNumber: i + 1,
              description: s.description || '',
              imageKey: s.imageKey || '',
              caption: s.caption || '',
            })),
        };
      case 'recommendation':
        return {
          recommendation: recommendationsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        };
      case 'poc':
        return { proof_of_concept: pocText };
      case 'evidence':
        return {
          evidence_items: evidence
            .filter((e) => (e.imageKey || '').trim() !== '' || (e.caption || '').trim() !== '')
            .map((e) => ({
              imageKey: e.imageKey || '',
              caption: e.caption || '',
            })),
        };
      case 'references':
        return {
          references: referencesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(buildPatch());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-high border border-outline rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-outline">
          <h2 className="text-base font-semibold text-on-surface">Edit · {sectionLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {sectionBareKey === 'description' ? (
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </Field>
          ) : null}

          {sectionBareKey === 'affected_urls' ? (
            <Field label="Affected URLs (one per line)">
              <textarea
                value={affectedUrlsText}
                onChange={(e) => setAffectedUrlsText(e.target.value)}
                rows={6}
                className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface font-mono focus:border-primary focus:outline-none"
                placeholder="https://example.com/vuln-1"
              />
            </Field>
          ) : null}

          {sectionBareKey === 'impact_likelihood' ? (
            <div className="space-y-4">
              <Field label="Impact severity">
                <select
                  value={impactSeverity}
                  onChange={(e) => setImpactSeverity(e.target.value)}
                  className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">—</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                  <option>Informational</option>
                </select>
              </Field>
              <Field label="Impact detail">
                <textarea
                  value={impactDetail}
                  onChange={(e) => setImpactDetail(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </Field>
              <Field label="Likelihood severity">
                <select
                  value={likelihoodSeverity}
                  onChange={(e) => setLikelihoodSeverity(e.target.value)}
                  className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">—</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                  <option>Informational</option>
                </select>
              </Field>
              <Field label="Likelihood detail">
                <textarea
                  value={likelihoodDetail}
                  onChange={(e) => setLikelihoodDetail(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </Field>
            </div>
          ) : null}

          {(sectionBareKey === 'steps' || sectionBareKey === 'steps_to_reproduce') ? (
            <StepEditor steps={steps} onChange={setSteps} />
          ) : null}

          {sectionBareKey === 'recommendation' ? (
            <Field label="Recommendations (one per line)">
              <textarea
                value={recommendationsText}
                onChange={(e) => setRecommendationsText(e.target.value)}
                rows={6}
                className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                placeholder="Add Title: description"
              />
            </Field>
          ) : null}

          {sectionBareKey === 'poc' ? (
            <Field label="Proof of Concept">
              <textarea
                value={pocText}
                onChange={(e) => setPocText(e.target.value)}
                rows={10}
                className="w-full rounded border border-outline bg-surface px-3 py-2 text-xs text-on-surface font-mono focus:border-primary focus:outline-none"
              />
            </Field>
          ) : null}

          {sectionBareKey === 'evidence' ? (
            <EvidenceItemEditor items={evidence} onChange={setEvidence} />
          ) : null}

          {sectionBareKey === 'references' ? (
            <Field label="References (one URL per line)">
              <textarea
                value={referencesText}
                onChange={(e) => setReferencesText(e.target.value)}
                rows={6}
                className="w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-on-surface font-mono focus:border-primary focus:outline-none"
                placeholder="https://owasp.org/..."
              />
            </Field>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-primary text-on-primary hover:bg-primary/90"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{label}</label>
    {children}
  </div>
);

export default SectionEditModal;
