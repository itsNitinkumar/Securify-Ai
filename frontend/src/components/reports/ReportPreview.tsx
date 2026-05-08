import React, { useMemo, useState } from 'react';
import { Finding } from '@/api/findingApi';
import { AlertCircle, CheckCircle, AlertTriangle, Info, Loader2, Eye, EyeOff } from 'lucide-react';

interface ReportPreviewProps {
  projectName: string;
  clientName?: string;
  findings: Finding[];
  selectedFindingIds: number[];
  isLoading?: boolean;
}

const severityConfig: Record<string, { color: string; icon: any; badge: string }> = {
  Critical: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle, badge: 'bg-red-600' },
  High: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertTriangle, badge: 'bg-orange-600' },
  Medium: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: AlertTriangle, badge: 'bg-yellow-600' },
  Low: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Info, badge: 'bg-blue-600' },
  Informational: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Info, badge: 'bg-gray-600' },
};

const severityOrder: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Informational: 4,
};

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  projectName,
  clientName,
  findings,
  selectedFindingIds,
  isLoading = false,
}) => {
  const [showPreview, setShowPreview] = useState(true);

  const visibleFindings = useMemo(
    () =>
      findings
        .filter((finding) => selectedFindingIds.includes(finding.id))
        .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5)),
    [findings, selectedFindingIds]
  );

  const severityCounts = {
    Critical: visibleFindings.filter(f => f.severity === 'Critical').length,
    High: visibleFindings.filter(f => f.severity === 'High').length,
    Medium: visibleFindings.filter(f => f.severity === 'Medium').length,
    Low: visibleFindings.filter(f => f.severity === 'Low').length,
    Informational: visibleFindings.filter(f => f.severity === 'Informational').length,
  };

  if (isLoading) {
    return (
      <div className="bg-surface-high rounded-lg shadow p-8 flex items-center justify-center border border-outline">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-3" />
        <span className="text-on-surface-variant">Loading findings preview...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-high rounded-lg shadow overflow-hidden border border-outline">
      {/* Header with Securify branding */}
      <div className="bg-surface px-6 py-8 border-b-4 border-primary">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-primary font-bold text-lg">🔒 SECURIFY</div>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <h2 className="text-on-surface text-2xl font-bold mb-2">{projectName}</h2>
        <p className="text-on-surface-variant text-sm">
          Client: {clientName || 'N/A'} | Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {showPreview && (
        <>
          {/* Executive Summary */}
          <div className="px-6 py-6 border-b border-outline">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="text-primary">▸</span> Executive Summary
            </h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-outline-variant">
                <div className="text-2xl font-bold text-red-400">{severityCounts.Critical}</div>
                <div className="text-sm text-red-400 font-medium">Critical</div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-outline-variant">
                <div className="text-2xl font-bold text-orange-400">{severityCounts.High}</div>
                <div className="text-sm text-orange-400 font-medium">High</div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-outline-variant">
                <div className="text-2xl font-bold text-yellow-400">{severityCounts.Medium}</div>
                <div className="text-sm text-yellow-400 font-medium">Medium</div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-outline-variant">
                <div className="text-2xl font-bold text-blue-400">{severityCounts.Low}</div>
                <div className="text-sm text-blue-400 font-medium">Low</div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-outline-variant">
                <div className="text-2xl font-bold text-on-surface">{visibleFindings.length}</div>
                <div className="text-sm text-on-surface-variant font-medium">Total</div>
              </div>
            </div>
          </div>

          {/* Vulnerability Summary Table */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="text-primary">▸</span> Vulnerability Summary
            </h3>

            {visibleFindings.length === 0 ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-medium">No findings to report</p>
                <p className="text-green-400 text-sm">All systems are secure!</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-outline rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-600 text-surface">
                      <th className="px-4 py-3 text-left font-semibold">#</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFindings.map((finding, idx) => (
                      <tr
                        key={finding.id}
                        className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-high'}
                      >
                        <td className="px-4 py-3 text-on-surface-variant font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 text-on-surface font-medium max-w-xs truncate">
                          {finding.title}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs font-bold text-white ${severityConfig[finding.severity].badge}`}
                          >
                            {finding.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-surface px-6 py-4 border-t border-outline text-xs text-on-surface-variant text-center">
            <p>© {new Date().getFullYear()} SecurifyAI | AI-Assisted Penetration Testing Platform</p>
          </div>
        </>
      )}
    </div>
  );
};
