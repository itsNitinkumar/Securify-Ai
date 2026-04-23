import axios from './axios';

export interface Report {
  id: number;
  project_id: number;
  report_name: string;
  file_path: string;
  file_type: 'docx' | 'pdf';
  generated_by: number;
  google_drive_id?: string;
  created_at: string;
}

export interface GenerateReportData {
  project_id: number;
  format: 'docx' | 'pdf';
  upload_to_drive?: boolean;
  share_with_client?: boolean;
  client_email?: string;
}

export const reportApi = {
  generateReport: async (data: GenerateReportData) => {
    const response = await axios.post('/reports/generate', data);
    return response.data;
  },

  downloadReport: async (id: number) => {
    const response = await axios.get(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getProjectReports: async (projectId: number) => {
    const response = await axios.get(`/reports/project/${projectId}`);
    return response.data;
  },
};
