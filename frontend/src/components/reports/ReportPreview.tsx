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
  Critical: { color: 'bg-red-100 text-red-800', icon: AlertCircle, badge: 'bg-red-600' },
  High: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, badge: 'bg-orange-600' },
  Medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, badge: 'bg-yellow-600' },
  Low: { color: 'bg-blue-100 text-blue-800', icon: Info, badge: 'bg-blue-600' },
  Informational: { color: 'bg-gray-100 text-gray-800', icon: Info, badge: 'bg-gray-600' },
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
    () => findings.filter((finding) => selectedFindingIds.includes(finding.id)),
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
      <div className="bg-white rounded-lg shadow p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-green-600 mr-3" />
        <span className="text-gray-700">Loading findings preview...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with Securify branding */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8 border-b-4 border-green-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-green-500 font-bold text-lg">🔒 SECURIFY</div>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-gray-400 hover:text-white transition-colors"
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">{projectName}</h2>
        <p className="text-gray-400 text-sm">
          Client: {clientName || 'N/A'} | Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {showPreview && (
        <>
          {/* Executive Summary */}
          <div className="px-6 py-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-500">▸</span> Executive Summary
            </h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{severityCounts.Critical}</div>
                <div className="text-sm text-red-700 font-medium">Critical</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{severityCounts.High}</div>
                <div className="text-sm text-orange-700 font-medium">High</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{severityCounts.Medium}</div>
                <div className="text-sm text-yellow-700 font-medium">Medium</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{severityCounts.Low}</div>
                <div className="text-sm text-blue-700 font-medium">Low</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-600">{visibleFindings.length}</div>
                <div className="text-sm text-gray-700 font-medium">Total</div>
              </div>
            </div>
          </div>

          {/* Vulnerability Summary Table */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-500">▸</span> Vulnerability Summary
            </h3>

            {visibleFindings.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">No findings to report</p>
                <p className="text-green-700 text-sm">All systems are secure!</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-500 text-white">
                      <th className="px-4 py-3 text-left font-semibold">#</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Severity</th>
                      <th className="px-4 py-3 text-left font-semibold">Affected Asset</th>
                      <th className="px-4 py-3 text-left font-semibold">Likelihood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFindings.map((finding, idx) => (
                      <tr
                        key={finding.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-3 text-gray-600 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">
                          {finding.title}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs font-bold text-white ${severityConfig[finding.severity].badge
                              }`}
                          >
                            {finding.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono max-w-xs truncate">
                          {finding.affected_target || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {typeof finding.likelihood === 'string'
                            ? finding.likelihood
                            : finding.likelihood?.severity || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t text-xs text-gray-600 text-center">
            <p>© {new Date().getFullYear()} SecurifyAI | AI-Assisted Penetration Testing Platform</p>
          </div>
        </>
      )}
    </div>
  );
};
