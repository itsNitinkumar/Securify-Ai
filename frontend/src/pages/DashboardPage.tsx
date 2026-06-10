import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Clock, Shield, Upload } from 'lucide-react';
import { dashboardApi, DashboardStats, SeverityItem, VelocityPoint, ClientRiskItem, DomainItem, ProjectStatusItem, CommentActivity } from '@/api/dashboardApi';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/dashboard/StatCard';
import SeverityChart from '@/components/dashboard/SeverityChart';
import RemediationVelocity from '@/components/dashboard/RemediationVelocity';
import VulnerabilityFeed from '@/components/dashboard/VulnerabilityFeed';
import AIInsights from '@/components/dashboard/AIInsights';
import FindingsByDomain from '@/components/dashboard/FindingsByDomain';
import ClientRisk from '@/components/dashboard/ClientRisk';
import CommentActivityCard from '@/components/dashboard/CommentActivityCard';
import ProjectsByStatus from '@/components/dashboard/ProjectsByStatus';
import TopReporters from '@/components/dashboard/TopReporters';

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [severityData, setSeverityData] = useState<SeverityItem[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityPoint[]>([]);
  const [mttr, setMttr] = useState<number>(0);
  const [domainData, setDomainData] = useState<DomainItem[]>([]);
  const [clientRiskData, setClientRiskData] = useState<ClientRiskItem[]>([]);
  const [commentData, setCommentData] = useState<CommentActivity | null>(null);
  const [projectStatusData, setProjectStatusData] = useState<ProjectStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsRes, severityRes, trendRes, velocityRes,
        mttrRes, domainRes, clientRes,
        commentRes, projectStatusRes,
      ] = await Promise.all([
        dashboardApi.getOverallStats(),
        dashboardApi.getFindingsBySeverity(),
        dashboardApi.getFindingsTrend(),
        dashboardApi.getRemediationVelocity(),
        dashboardApi.getMttr(),
        dashboardApi.getFindingsByDomain(),
        dashboardApi.getClientRisk(),
        dashboardApi.getComments(),
        dashboardApi.getProjectsByStatus(),
      ]);

      setStats(statsRes.data);
      setSeverityData(severityRes.data || []);
      setTrendData(trendRes.data || []);
      setVelocityData(velocityRes.data || []);
      setMttr(mttrRes.data?.avg_resolution_days || 0);
      setDomainData(domainRes.data || []);
      setClientRiskData(clientRes.data || []);
      setCommentData(commentRes.data);
      setProjectStatusData(projectStatusRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = () => {
    if (!stats) return 0;
    const total = stats.total_findings || 1;
    const critical = Number(stats.critical_findings) || 0;
    const high = Number(stats.high_findings) || 0;
    const medium = Number(stats.medium_findings) || 0;
    const low = Number(stats.low_findings) || 0;
    const info = Number(stats.info_findings) || 0;
    const weighted = (critical * 10) + (high * 7) + (medium * 4) + (low * 2) + (info * 1);
    const score = Math.round((weighted / (total * 10)) * 100);
    return Number.isFinite(score) ? Math.min(100, score) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                Securify Dashboard
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              Security posture monitoring and vulnerability management
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          <StatCard
            title="Total Findings"
            value={stats?.total_findings || 0}
            icon={Activity}
          />
          <StatCard
            title="Critical Issues"
            value={stats?.critical_findings || 0}
            subtitle={`${stats?.high_findings || 0} high severity`}
            icon={AlertTriangle}
            variant="critical"
          />
          <StatCard
            title="Risk Score"
            value={calculateRiskScore()}
            suffix="/100"
            icon={TrendingUp}
            variant={calculateRiskScore() > 60 ? 'critical' : calculateRiskScore() > 30 ? 'warning' : 'default'}
          />
          <StatCard
            title="MTTR"
            value={mttr}
            suffix="d"
            subtitle="avg fix time"
            icon={Clock}
          />
          <StatCard
            title="Open Findings"
            value={stats?.open_findings || 0}
            subtitle={`${stats?.pending_findings || 0} pending review`}
            icon={Activity}
          />
        </div>

        {/* Severity + Remediation Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <SeverityChart data={severityData} />
          <RemediationVelocity data={velocityData} />
        </div>

        {/* Projects by Status + Comments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <ProjectsByStatus data={projectStatusData} />
          </div>
          {commentData && (
            <CommentActivityCard data={commentData} />
          )}
        </div>

        {/* Insights */}
        <AIInsights />

        {/* Domain + Top Reporters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <FindingsByDomain data={domainData} />
          <TopReporters />
        </div>

        {/* Client Risk */}
        <ClientRisk data={clientRiskData} />

        {/* Vulnerability Feed */}
        <VulnerabilityFeed />
      </div>
    </div>
  );
};

export default DashboardPage;
