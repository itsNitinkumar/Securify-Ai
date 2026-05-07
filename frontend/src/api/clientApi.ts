import axios from './axios';

export interface Client {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export const clientApi = {
  listClients: async (): Promise<{ success: boolean; data: Client[] } | any> => {
    const response = await axios.get('/clients');
    return response.data;
  },

  createClient: async (name: string): Promise<{ success: boolean; data: Client } | any> => {
    const response = await axios.post('/clients', { name });
    return response.data;
  },
};
