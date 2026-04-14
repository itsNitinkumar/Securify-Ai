import { useState } from 'react';
import { Finding, findingApi } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Save, X } from 'lucide-react';

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
    steps_to_reproduce: finding.steps_to_reproduce || '',
    remediation: finding.remediation || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await findingApi.updateFinding(finding.id, editData);
      onUpdate();
    } catch (error) {
      console.error('Failed to update finding:', error);
      alert('Failed to update finding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-on-surface">Description</h3>
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
              value={editData.steps_to_reproduce}
              onChange={(e) =>
                setEditData({ ...editData, steps_to_reproduce: e.target.value })
              }
              rows={6}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
            />
          ) : (
            <pre className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono bg-surface p-4 rounded border border-outline-variant overflow-x-auto">
              {finding.steps_to_reproduce}
            </pre>
          )}
        </Card>
      )}

      {/* Remediation */}
      <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-on-surface">Remediation Strategy</h3>
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
                className="block text-sm text-primary hover:underline"
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
                steps_to_reproduce: finding.steps_to_reproduce || '',
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
