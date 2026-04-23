import React, { useEffect, useState } from 'react';
import { reportApi, Report } from '@/api/reportApi';
import { toast } from 'react-hot-toast';
import { Download, FileText, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReportsListProps {
  projectId: number;
}

export const ReportsList: React.FC<ReportsListProps> = ({ projectId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    try {
      const result = await reportApi.getProjectReports(projectId);
      setReports(result.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    
    try {
      const blob = await reportApi.downloadReport(report.id);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.report_name}.${report.file_type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No reports generated yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Generated Reports</h3>
      </div>
      
      <div className="divide-y">
        {reports.map((report) => (
          <div
            key={report.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {report.report_name}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                    <span className="uppercase font-medium">
                      {report.file_type}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleDownload(report)}
                disabled={downloadingId === report.id}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {downloadingId === report.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
