import axios from './axios';

export interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  assigned_reporter_id?: number | null;
  assigned_reporter_name?: string;
  start_date?: string;
  end_date?: string;
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  domains?: string[];
  template_id?: number;
  template_name?: string;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
  created_by: number;
  status?: string;
  created_at: string;
  updated_at: string;
  findings_count?: number;
  critical_count?: number;
  high_count?: number;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  client_name?: string | null;
  client_id?: number | null;
  assigned_reporter_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  application_details?: Array<{ name: string; url: string }>;
  user_roles?: Array<{ role: string; username: string }>;
  domains?: string[];
  template_id?: number | null;
  template_name?: string | null;
  out_of_scope_endpoints?: Array<{ name: string; url: string }>;
  include_out_of_scope_endpoints?: boolean;
}

export interface ProjectFilters {
  client_id?: number;
  status?: string;
  assigned_reporter_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const projectApi = {
  getAllProjects: async (filters?: ProjectFilters) => {
    const response = await axios.get('/projects', { params: filters });
    return response.data;
  },

  getProject: async (id: number) => {
    const response = await axios.get(`/projects/${id}`);
    return response.data;
  },

  getProjectWithFindings: async (id: number) => {
    const response = await axios.get(`/projects/${id}/with-findings`);
    return response.data;
  },

  getReviewBundle: async (id: number) => {
    const response = await axios.get(`/projects/${id}/review-bundle`);
    return response.data;
  },

  createProject: async (data: CreateProjectData) => {
    const response = await axios.post('/projects', data);
    return response.data;
  },

  updateProject: async (id: number, data: Partial<CreateProjectData>) => {
    const response = await axios.put(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: number) => {
    const response = await axios.delete(`/projects/${id}`);
    return response.data;
  },

  assignReporter: async (id: number, reporterId: number | null) => {
    const response = await axios.patch(`/projects/${id}/assign-reporter`, { reporter_id: reporterId });
    return response.data;
  },

  // Workflow operations
  getWorkflowHistory: async (id: number) => {
    const response = await axios.get(`/projects/${id}/workflow-history`);
    return response.data;
  },

  submitForReview: async (id: number) => {
    const response = await axios.post(`/projects/${id}/submit-review`);
    return response.data;
  },

  requestChanges: async (id: number) => {
    const response = await axios.post(`/projects/${id}/request-changes`);
    return response.data;
  },

  markComplete: async (id: number) => {
    const response = await axios.post(`/projects/${id}/mark-complete`);
    return response.data;
  },
};
