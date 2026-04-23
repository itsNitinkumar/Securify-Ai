import React, { useState } from 'react';
import { reportApi } from '@/api/reportApi';
import { toast } from 'react-hot-toast';
import { Download, FileText, Loader2 } from 'lucide-react';

interface ReportGeneratorProps {
  projectId: number;
  projectName: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  projectId,
  projectName,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx');

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate report
      const result = await reportApi.generateReport({
        project_id: projectId,
        format: format,
      });

      toast.success('Report generated successfully!');

      // Download the report
      const reportId = result.data.reportId;
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
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Generate Report</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Format
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="docx"
                checked={format === 'docx'}
                onChange={(e) => setFormat(e.target.value as 'docx')}
                className="mr-2"
                disabled={isGenerating}
              />
              <span className="text-sm">Word Document (.docx)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={(e) => setFormat(e.target.value as 'pdf')}
                className="mr-2"
                disabled={isGenerating}
              />
              <span className="text-sm">PDF (.pdf)</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate & Download Report
            </>
          )}
        </button>

        <p className="text-xs text-gray-500">
          The report will include all approved findings for this project.
        </p>
      </div>
    </div>
  );
};
