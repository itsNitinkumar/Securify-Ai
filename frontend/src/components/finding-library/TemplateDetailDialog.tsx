import { useState } from 'react';
import { X, Copy, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { FindingTemplate, findingLibraryApi } from '@/api/findingLibraryApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TemplateDetailDialogProps {
  template: FindingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const severityColors = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const TemplateDetailDialog = ({
  template,
  open,
  onOpenChange,
  onUpdate,
}: TemplateDetailDialogProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      setDeleting(true);
      await findingLibraryApi.deleteTemplate(template.id);
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = () => {
    const text = `${template.title}\n\n${template.description}\n\nRemediation:\n${template.remediation}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={severityColors[template.severity]}>
                  {template.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="border-outline text-on-surface-variant">
                  {template.category}
                </Badge>
                {template.is_public && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    PUBLIC
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl text-on-surface">{template.title}</DialogTitle>
              <DialogDescription>View and manage finding template details.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface rounded-lg border border-outline-variant">
            {template.cvss_score && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">CVSS Score</p>
                <p className="text-lg font-semibold text-primary">{template.cvss_score}</p>
              </div>
            )}
            {template.cwe_id && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">CWE ID</p>
                <p className="text-sm text-on-surface">{template.cwe_id}</p>
              </div>
            )}
            {template.owasp_category && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">OWASP</p>
                <p className="text-sm text-on-surface">{template.owasp_category}</p>
              </div>
            )}
            {template.likelihood && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Likelihood</p>
                <p className="text-sm text-on-surface">{template.likelihood}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-2">Description</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {template.description}
            </p>
          </div>

          {/* Affected Component */}
          {template.affected_component && (
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-2">Affected Component</h3>
              <p className="text-sm text-on-surface-variant">{template.affected_component}</p>
            </div>
          )}

          {/* Steps to Reproduce */}
          {template.steps_to_reproduce && (
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-2">Steps to Reproduce</h3>
              <div className="p-3 bg-surface rounded border border-outline-variant">
                <pre className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono">
                  {template.steps_to_reproduce}
                </pre>
              </div>
            </div>
          )}

          {/* Remediation */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface mb-2">Remediation Strategy</h3>
            <div className="p-4 bg-primary/5 rounded border border-primary/20">
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                {template.remediation}
              </p>
            </div>
          </div>

          {/* Impact */}
          {template.impact && (
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-2">Impact</h3>
              <p className="text-sm text-on-surface-variant">{template.impact}</p>
            </div>
          )}

          {/* Reference Links */}
          {template.reference_links && template.reference_links.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-2">References</h3>
              <div className="space-y-2">
                {template.reference_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-outline-variant mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="border-error/30 text-error hover:bg-error/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
          <Button className="bg-primary text-surface hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Insert into Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDetailDialog;
