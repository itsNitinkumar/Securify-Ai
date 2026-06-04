import axiosInstance from './axios';
import { ApiResponse } from '../types';

export interface SearchResult {
  entity: string;
  intent: string;
  parsed: any;
  results: any[];
  analytics: any;
  count: number;
}

export interface SearchSuggestion {
  projects: string[];
  reporters: string[];
  clients: string[];
  templates: string[];
  findings: string[];
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  entity: string;
  filters: any;
  created_at: string;
}

export const searchApi = {
  query: (query: string) =>
    axiosInstance.post<SearchResult>('/search/query', { query }),

  getSuggestions: () =>
    axiosInstance.get<ApiResponse<SearchSuggestion>>('/search/suggestions'),

  getHistory: (limit = 10) =>
    axiosInstance.get<ApiResponse<SearchHistoryItem[]>>('/search/history', { params: { limit } }),

  clearHistory: () =>
    axiosInstance.delete<ApiResponse>('/search/history'),
};
