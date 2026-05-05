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
  template_id?: number;
  finding_ids?: number[];
  upload_to_drive?: boolean;
  share_with_client?: boolean;
  client_email?: string;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  template_data: any;
  logo_path?: string;
  is_default: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  template_data: string;
  logo_path?: string;
  is_default?: boolean;
}

export const reportApi = {
  generateReport: async (data: GenerateReportData) => {
    const response = await axios.post('/reports/generate', data, {
      timeout: 120000, // 2 minutes for report generation
    });
    return response.data;
  },

  previewReport: async (data: GenerateReportData) => {
    const response = await axios.post('/reports/preview', data, {
      responseType: 'blob',
      timeout: 120000, // 2 minutes for report preview
    });
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

  // Template Management
  getAllTemplates: async () => {
    const response = await axios.get('/reports/templates');
    return response.data;
  },

  getTemplate: async (id: number) => {
    const response = await axios.get(`/reports/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: CreateTemplateData) => {
    const response = await axios.post('/reports/templates', data);
    return response.data;
  },

  updateTemplate: async (id: number, data: Partial<CreateTemplateData>) => {
    const response = await axios.put(`/reports/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: number) => {
    const response = await axios.delete(`/reports/templates/${id}`);
    return response.data;
  },
};
