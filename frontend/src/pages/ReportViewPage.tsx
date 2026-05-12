import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  Calendar,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const ReportViewPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadReportData();
    }
  }, [projectId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [projectRes, findingsRes] = await Promise.all([
        projectApi.getProject(parseInt(projectId!)),
        findingApi.getAllFindings({ project_id: parseInt(projectId!), status: 'approved' }),
      ]);
      setProject(projectRes.data);
      setFindings(Array.isArray(findingsRes.data) ? findingsRes.data : findingsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityScore = () => {
    if (findings.length === 0) return 100;
    const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
    const highCount = findings.filter((f) => f.severity === 'High').length;
    const score = Math.max(0, 100 - (criticalCount * 15 + highCount * 10));
    return score;
  };

  const severityColors: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Card className="p-12 text-center bg-surface-high border-outline">
          <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">Report not found</h3>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </Card>
      </div>
    );
  }

  const securityScore = calculateSecurityScore();
  const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
  const highCount = findings.filter((f) => f.severity === 'High').length;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header Banner */}
      <div className="bg-surface-low border-b border-outline">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4 text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-3">
                QUARTERLY SECURITY ASSESSMENT
              </Badge>
              <h1 className="text-2xl md:text-4xl font-bold text-on-surface mb-2">
                {project.name}
              </h1>
              <p className="text-sm md:text-base text-on-surface-variant">
                Comprehensive analysis of network perimeter, cloud assets, and identity access
                management for {project.client_name || 'Client'}
              </p>
            </div>
            <Button className="bg-primary text-surface hover:bg-primary/90 w-full md:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download RMB
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Security Posture Score */}
          <Card className="p-6 bg-surface-high border-outline">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase">Security Posture Score</p>
              </div>
            </div>
            <div className="text-5xl font-bold text-on-surface font-technical mb-2">
              {securityScore}
              <span className="text-2xl text-on-surface-variant">/100</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Score increased by +12pts since last quarter due to automated patching
            </p>
          </Card>

          {/* Active Threats */}
          <Card className="p-6 bg-surface-high border-outline">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-error/10">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase">Active Threats</p>
              </div>
            </div>
            <div className="text-5xl font-bold text-error font-technical mb-2">
              {criticalCount}
              <span className="text-2xl text-on-surface-variant"> CRITICAL</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              ⚠️ ACTIVE PRIORITY ITEM
            </p>
          </Card>

          {/* Scan Duration */}
          <Card className="p-6 bg-surface-high border-outline">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-surface-variant">
                <Calendar className="w-6 h-6 text-on-surface-variant" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase">Scan Duration</p>
              </div>
            </div>
            <div className="text-5xl font-bold text-on-surface font-technical mb-2">
              14
              <span className="text-2xl text-on-surface-variant">d</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Completed Sept 15, 2024
            </p>
          </Card>
        </div>

        {/* Asset Discovery */}
        <Card className="p-6 bg-surface-high border-outline mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-6">Asset Discovery</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">Cloud Hosts</span>
                <span className="text-lg font-bold text-primary font-technical">142</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">Active APIs</span>
                <span className="text-lg font-bold text-primary font-technical">28</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-on-surface-variant">Static IPs</span>
                <span className="text-lg font-bold text-primary font-technical">09</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Executive Summary */}
        <Card className="p-6 bg-surface-high border-outline mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Executive Summary</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
            The Q3 Security Assessment focused on evaluating the resilience of the external perimeter
            and internal API gateways. Our Sentinel AI agents identified several strengths in the
            current deployment, notably the robust implementation of Multi-Factor Authentication (MFA)
            across all workforce identities.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            However, the assessment also revealed a critical misconfiguration in the S3 bucket policies
            and an unpatched vulnerability (CVE-2023-XXXX) in the legacy staging environment. Immediate
            remediation is recommended for the identified 'Critical' and 'High' severity findings to
            maintain compliance with SOC2 Type II standards.
          </p>
        </Card>

        {/* Key Findings Library */}
        <Card className="p-6 bg-surface-high border-outline mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-6">Key Findings Library</h2>
          <div className="space-y-4">
            {findings.slice(0, 5).map((finding, index) => (
              <div
                key={finding.id}
                className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-surface-variant flex items-center justify-center">
                      <span className="text-lg font-bold text-on-surface font-technical">
                        {String.fromCharCode(67 + index)}1
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-on-surface">
                        {finding.title}
                      </h3>
                      <Badge className={`text-xs flex-shrink-0 ${severityColors[finding.severity]}`}>
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">
                      {finding.description}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sentinel AI Insights */}
        <Card className="p-6 bg-surface-high border-primary/20 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-on-surface">Sentinel AI Insights</h2>
          </div>
          <div className="p-4 bg-surface rounded-lg border border-outline-variant">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              "Patterns suggest a potential lateral movement path between the staging DB and
              production API cluster. Recommend isolating VLAN 402. Should I generate a remediation
              plan?"
            </p>
          </div>
        </Card>

        {/* Report Details */}
        <Card className="p-6 bg-surface-high border-outline">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Report Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-on-surface-variant mb-1">Shared By</p>
              <p className="text-on-surface font-medium">Marcus Chen (Lead Pentester)</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1">Link Expires</p>
              <p className="text-on-surface font-medium">Jan 12, 2024</p>
            </div>
            <div>
              <p className="text-on-surface-variant mb-1">Methodology</p>
              <p className="text-on-surface font-medium">3 NWASP A3&A v4.0</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-surface-low border-t border-outline mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-on-surface-variant">
              <span className="text-primary font-semibold">SecurifyAI</span>
              <span className="mx-2">•</span>
              SENTINEL INTELLIGENCE SYSTEMS
            </div>
            <div className="flex items-center gap-6 text-xs text-on-surface-variant">
              <a href="#" className="hover:text-primary transition-colors">
                PRIVACY POLICY
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                SECURITY SWIMMING
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                INCIDENT SUPPORT
              </a>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-primary">EVERYTHING NORMAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewPage;
