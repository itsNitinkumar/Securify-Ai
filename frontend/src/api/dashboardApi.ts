import axios from './axios';

export interface DashboardStats {
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  info_findings: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_reports: number;
  pending_reviews: number;
  avg_resolution_time: number;
}

export interface FindingsBySeverity {
  severity: string;
  count: number;
  percentage: number;
}

export interface FindingsByStatus {
  status: string;
  count: number;
}

export interface TopReporter {
  user_id: number;
  user_name: string;
  findings_count: number;
  reports_count: number;
  avg_severity: string;
}

export interface FindingsTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export const dashboardApi = {
  getOverallStats: async () => {
    const response = await axios.get('/dashboard/stats');
    return response.data;
  },

  getFindingsBySeverity: async () => {
    const response = await axios.get('/dashboard/findings/by-severity');
    return response.data;
  },

  getFindingsByStatus: async () => {
    const response = await axios.get('/dashboard/findings/by-status');
    return response.data;
  },

  getTopReporters: async (limit: number = 5) => {
    const response = await axios.get('/dashboard/reporters/top', {
      params: { limit },
    });
    return response.data;
  },

  getProjectStats: async (projectId: number) => {
    const response = await axios.get(`/dashboard/projects/${projectId}/stats`);
    return response.data;
  },

  getFindingsTrend: async () => {
    const response = await axios.get('/dashboard/findings/trend');
    return response.data;
  },
};
