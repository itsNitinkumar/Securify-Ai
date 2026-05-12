import React, { useState, useEffect } from 'react';
import { reportApi } from '@/api/reportApi';
import { toast } from 'react-hot-toast';
import { Download, FileText, Loader2, FileJson } from 'lucide-react';

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  is_default: boolean;
}

interface ReportGeneratorProps {
  projectId: number;
  projectName: string;
  selectedFindingIds: number[];
  projectTemplateId?: number;
  onImportRefresh?: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  projectId,
  projectName,
  selectedFindingIds,
  projectTemplateId,
  onImportRefresh,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [format, setFormat] = useState<'docx' | 'pdf'>('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(projectTemplateId || null);

  // Load default template
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        const response = await reportApi.getAllTemplates();
        const templatesList = response.data || response;
        if (!selectedTemplate && templatesList.length > 0) {
          const defaultTemplate = templatesList.find((t: ReportTemplate) => t.is_default);
          setSelectedTemplate(defaultTemplate?.id || templatesList[0].id);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadDefaultTemplate();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate report
      const result = await reportApi.generateReport({
        project_id: projectId,
        format: format,
        template_id: selectedTemplate || undefined,
        finding_ids: selectedFindingIds,
      });

      toast.success('Report generated successfully!');

      // Download the report
      const reportId = result.reportId;
      const blob = await reportApi.downloadReport(reportId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_Report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      const errorMessage = 
        typeof error === 'string' ? error :
        error?.message ? error.message :
        error?.response?.data?.message || 
        error?.response?.data?.error ||
        'Failed to generate report';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = async () => {
    setIsPreviewing(true);

    try {
      const blob = await reportApi.previewReport({
        project_id: projectId,
        format: 'pdf',
        template_id: selectedTemplate || undefined,
        finding_ids: selectedFindingIds,
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      toast.success('Preview opened in a new tab');
    } catch (error: any) {
      console.error('Error previewing report:', error);
      const errorMessage =
        typeof error === 'string' ? error :
        error?.message ? error.message :
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to preview report';
      toast.error(errorMessage);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="bg-surface-high rounded-lg shadow overflow-hidden border-t-4" style={{ borderTopColor: '#00d639' }}>
      {/* Header */}
      <div className="bg-surface px-8 py-6 border-b-4" style={{ borderBottomColor: '#00d639' }}>
        <div className="flex items-center gap-3">
          <img
            src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png"
            alt="Securify"
            className="h-4"
          />
          <h3 className="text-on-surface text-lg font-bold">Generate Report</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-bold text-on-surface mb-4" style={{ color: '#00d639' }}>
            SELECT REPORT FORMAT
          </label>
          <div className="space-y-3">
            {/* PDF Option */}
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-surface"
              style={{ borderColor: format === 'pdf' ? '#00d639' : '#e5e7eb' }}>
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value as 'pdf')}
                disabled={isGenerating}
                className="mr-4 w-4 h-4"
                style={{ accentColor: '#00d639' }}
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface">PDF Document</div>
                <div className="text-xs text-on-surface-variant mt-1">Professional formatted report with exact styling and colors</div>
              </div>
              <FileText className="w-6 h-6 text-red-600" />
            </label>

            {/* DOCX Option */}
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-surface"
              style={{ borderColor: format === 'docx' ? '#00d639' : '#e5e7eb' }}>
              <input
                type="radio"
                value="docx"
                checked={format === 'docx'}
                onChange={(e) => setFormat(e.target.value as 'docx')}
                disabled={isGenerating}
                className="mr-4 w-4 h-4"
                style={{ accentColor: '#00d639' }}
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface">Word Document</div>
                <div className="text-xs text-on-surface-variant mt-1">Editable report for further customization and client modifications</div>
              </div>
              <FileJson className="w-6 h-6 text-blue-600" />
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || selectedFindingIds.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-surface rounded-lg font-bold transition-all text-sm"
          style={{
            backgroundColor: isGenerating || selectedFindingIds.length === 0 ? '#374151' : '#00d639',
            cursor: isGenerating || selectedFindingIds.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate & Download Report
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="bg-surface px-8 py-4 border-t-4" style={{ borderTopColor: '#00d639' }}>
        <p className="text-xs text-on-surface-variant text-center">
          © {new Date().getFullYear()} SecurifyAI | Confidential - For Authorized Recipients Only
        </p>
      </div>
    </div>
  );
};
