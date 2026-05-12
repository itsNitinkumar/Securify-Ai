import axios from './axios';

export interface Template {
  id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  sections?: any;
  created_by?: number;
  created_at?: string;
}

export const templateApi = {
  getAllTemplates: async () => {
    const response = await axios.get('/templates');
    return response.data;
  },

  getTemplate: async (id: number) => {
    const response = await axios.get(`/templates/${id}`);
    return response.data;
  },

  getDefaultTemplate: async () => {
    const response = await axios.get('/templates/default');
    return response.data;
  },
};