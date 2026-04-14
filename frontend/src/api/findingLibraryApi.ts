import axios from './axios';

export interface FindingTemplate {
  id: number;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  affected_component?: string;
  likelihood?: string;
  impact?: string;
  steps_to_reproduce?: string;
  remediation: string;
  reference_links?: string[];
  owasp_category?: string;
  cwe_id?: string;
  cvss_score?: number;
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  title: string;
  category: string;
  severity: string;
  description: string;
  affected_component?: string;
  likelihood?: string;
  impact?: string;
  steps_to_reproduce?: string;
  remediation: string;
  reference_links?: string[];
  owasp_category?: string;
  cwe_id?: string;
  cvss_score?: number;
  is_public?: boolean;
}

export const findingLibraryApi = {
  getAllTemplates: async () => {
    const response = await axios.get('/finding-library');
    return response.data;
  },

  getCategories: async () => {
    const response = await axios.get('/finding-library/categories');
    return response.data;
  },

  searchTemplates: async (query: string) => {
    const response = await axios.get('/finding-library/search', {
      params: { q: query },
    });
    return response.data;
  },

  getByCategory: async (category: string) => {
    const response = await axios.get(`/finding-library/category/${category}`);
    return response.data;
  },

  getBySeverity: async (severity: string) => {
    const response = await axios.get(`/finding-library/severity/${severity}`);
    return response.data;
  },

  getTemplate: async (id: number) => {
    const response = await axios.get(`/finding-library/${id}`);
    return response.data;
  },

  getUserTemplates: async () => {
    const response = await axios.get('/finding-library/my-templates');
    return response.data;
  },

  createTemplate: async (data: CreateTemplateData) => {
    const response = await axios.post('/finding-library', data);
    return response.data;
  },

  updateTemplate: async (id: number, data: Partial<CreateTemplateData>) => {
    const response = await axios.put(`/finding-library/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: number) => {
    const response = await axios.delete(`/finding-library/${id}`);
    return response.data;
  },

  cloneToFinding: async (id: number, projectId: number) => {
    const response = await axios.post(`/finding-library/${id}/clone`, {
      project_id: projectId,
    });
    return response.data;
  },
};
