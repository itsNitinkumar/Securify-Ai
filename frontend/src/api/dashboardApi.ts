import axios from './axios';

export interface DashboardStats {
  total_projects: number;
  completed_projects: number;
  draft_projects: number;
  pending_review_projects: number;
  total_findings: number;
  approved_findings: number;
  open_findings: number;
  draft_findings: number;
  pending_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  info_findings: number;
  total_users: number;
  total_reports: number;
  unresolved_comments: number;
}

export interface SeverityItem {
  severity: string;
  count: number;
  percentage: number;
}

export interface StatusItem {
  status: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
  severity: string;
}

export interface MttrData {
  avg_resolution_days: number;
  resolved_count: number;
  total_count: number;
}

export interface VelocityPoint {
  week_label: string;
  created_count: number;
  closed_count: number;
}

export interface CategoryItem {
  category: string;
  count: number;
}

export interface DomainItem {
  domain: string;
  count: number;
  critical_high_count: number;
}

export interface ClientRiskItem {
  client_name: string;
  client_id: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
}

export interface RecentFinding {
  id: number;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  affected_target: any;
  finding_type: string;
  project_name: string;
}

export interface CommentActivity {
  open_threads: number;
  resolved_threads: number;
  unresolved_comments: number;
  resolved_comments: number;
}

export interface ProjectStatusItem {
  status: string;
  count: number;
}

export interface TopReporter {
  id: number;
  name: string;
  email: string;
  findings_count: number;
  approved_count: number;
  critical_high_count: number;
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

  getFindingsTrend: async () => {
    const response = await axios.get('/dashboard/findings/trend');
    return response.data;
  },

  getRecentFindings: async (limit: number = 10) => {
    const response = await axios.get('/dashboard/findings/recent', { params: { limit } });
    return response.data;
  },

  getFindingsByCategory: async () => {
    const response = await axios.get('/dashboard/findings/by-category');
    return response.data;
  },

  getFindingsByDomain: async () => {
    const response = await axios.get('/dashboard/findings/by-domain');
    return response.data;
  },

  getMttr: async () => {
    const response = await axios.get('/dashboard/mttr');
    return response.data;
  },

  getRemediationVelocity: async () => {
    const response = await axios.get('/dashboard/remediation-velocity');
    return response.data;
  },

  getClientRisk: async () => {
    const response = await axios.get('/dashboard/client-risk');
    return response.data;
  },

  getComments: async () => {
    const response = await axios.get('/dashboard/comments');
    return response.data;
  },

  getProjectsByStatus: async () => {
    const response = await axios.get('/dashboard/projects-by-status');
    return response.data;
  },

  getTopReporters: async (limit: number = 5) => {
    const response = await axios.get('/dashboard/reporters/top', { params: { limit } });
    return response.data;
  },

  getProjectStats: async (projectId: number) => {
    const response = await axios.get(`/dashboard/projects/${projectId}/stats`);
    return response.data;
  },
};
