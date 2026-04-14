import axios from './axios';

export interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  findings_count?: number;
  critical_count?: number;
  high_count?: number;
  status?: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  client_name?: string;
}

export const projectApi = {
  getAllProjects: async () => {
    const response = await axios.get('/projects');
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
};
