import { Finding } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';

interface FindingMetadataProps {
  finding: Finding;
}

const FindingMetadata = ({ finding }: FindingMetadataProps) => {
  const renderValue = (value: string | { severity: string; detail: string } | undefined) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.detail) return value.detail;
    return String(value);
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <h3 className="text-sm font-semibold text-on-surface mb-4">Metadata</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {finding.cvss_score && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs text-on-surface-variant">CVSS Score</span>
            </div>
            <div className="text-xl font-bold text-primary font-technical">
              {finding.cvss_score}
            </div>
          </div>
        )}
        {finding.likelihood && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-on-surface-variant" />
              <span className="text-xs text-on-surface-variant">Likelihood</span>
            </div>
            <div className="text-sm font-medium text-on-surface">
              {renderValue(finding.likelihood)}
            </div>
          </div>
        )}
        {finding.impact && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-error" />
              <span className="text-xs text-on-surface-variant">Impact</span>
            </div>
            <div className="text-sm font-medium text-on-surface">
              {renderValue(finding.impact)}
            </div>
          </div>
        )}
        {finding.affected_component && (
          <div>
            <span className="text-xs text-on-surface-variant block mb-1">Component</span>
            <div className="text-sm font-medium text-on-surface line-clamp-2">
              {finding.affected_component}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FindingMetadata;
