import React, { useState, useEffect } from 'react';
import { reportApi } from '@/api/reportApi';
import { Finding } from '@/api/findingApi';
import { Loader2, Eye, EyeOff, FileText } from 'lucide-react';

interface ReportPreviewProps {
  projectName: string;
  clientName?: string;
  findings: Finding[];
  selectedFindingIds: number[];
  isLoading?: boolean;
  projectId?: number;
  projectTemplateId?: number;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  projectName,
  clientName,
  findings,
  selectedFindingIds,
  isLoading: propsLoading,
  projectId,
  projectTemplateId,
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Parent components often pass a new array instance on each render.
  // Use a stable key to avoid refetching/reloading the preview unnecessarily.
  const selectedKey = selectedFindingIds.length
    ? [...selectedFindingIds].sort((a, b) => a - b).join(',')
    : '';

  useEffect(() => {
    if (showPreview && projectId && selectedKey) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, projectId, selectedKey, projectTemplateId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const fetchPreview = async () => {
    if (!projectId) return;
    
    setLoading(true);

    try {
      const pdfBlob = await reportApi.previewReport({
        project_id: projectId,
        format: 'pdf',
        template_id: projectTemplateId || undefined,
        finding_ids: selectedFindingIds,
      });
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch {
      // Keep last good preview on screen if regeneration fails.
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = () => setShowPreview(!showPreview);

  if (propsLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 flex items-center justify-center border border-gray-200">
        <Loader2 className="w-5 h-5 animate-spin text-green-600 mr-3" />
        <span className="text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00d639] to-[#00b830] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">🔒 SECURIFY</span>
          <span className="text-white/80 text-sm">Report Preview</span>
        </div>
        <button
          onClick={togglePreview}
          className="text-white/80 hover:text-white"
        >
          {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {showPreview && (
        <div className="relative" style={{ minHeight: '800px' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">Generating report preview...</p>
              </div>
            </div>
          )}

          {/* PDF Preview - success case */}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              className="w-full"
              style={{
                minHeight: '800px',
                border: 'none',
              }}
              title="Report Preview"
            />
          )}

          {!pdfUrl && !loading && selectedFindingIds.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Select findings to preview the report</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} SecurifyAI | Preview shows document pages</p>
      </div>
    </div>
  );
};
