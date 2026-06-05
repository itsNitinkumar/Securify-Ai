import { useState, useEffect } from 'react';
import {
    Activity,
    AlertTriangle,
    TrendingUp,
    Clock,
    Shield,
    Sparkles,
    ArrowRight,
    Upload
} from 'lucide-react';
import { dashboardApi, DashboardStats } from '@/api/dashboardApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/dashboard/StatCard';
import SeverityChart from '@/components/dashboard/SeverityChart';
import RemediationVelocity from '@/components/dashboard/RemediationVelocity';
import VulnerabilityFeed from '@/components/dashboard/VulnerabilityFeed';
import AIInsights from '@/components/dashboard/AIInsights';

const DashboardPage = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [severityData, setSeverityData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiQuery, setAiQuery] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, severityRes, trendRes] = await Promise.all([
                dashboardApi.getOverallStats(),
                dashboardApi.getFindingsBySeverity(),
                dashboardApi.getFindingsTrend(),
            ]);

            setStats(statsRes.data);
            setSeverityData(severityRes.data);
            setTrendData(trendRes.data);
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
        const weighted =
            (critical * 10) +
            (high * 7) +
            (medium * 4) +
            (low * 2) +
            (info * 1);
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
                                Neural Sentinel Interface
                            </h1>
                        </div>
                        <p className="text-sm md:text-base text-on-surface-variant">
                            Real-time security posture monitoring and threat intelligence
                        </p>
                    </div>
                    <Button className="bg-primary text-surface hover:bg-primary/90 w-full md:w-auto">
                        <Upload className="w-4 h-4 mr-2" />
                        NESSUS_IMPORT
                    </Button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6">
                {/* AI Query Interface */}
                <Card className="p-4 md:p-6 bg-surface-high border-primary/20 glow-primary">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="p-2 md:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-on-surface mb-2 text-sm md:text-base">
                                Sentinel AI - Ready for Instruction
                            </h3>
                            <input
                                type="text"
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                placeholder="Show critical findings from last month..."
                                className="w-full px-3 md:px-4 py-2 md:py-3 bg-surface border border-outline rounded-lg text-on-surface text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                            />
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline" className="border-primary/30 text-primary">
                                    DATA SANITIZED BEFORE AI PROCESSING
                                </Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard
                        title="Total Findings"
                        value={stats?.total_findings || 0}
                        change="+13.4%"
                        icon={Activity}
                        trend="up"
                    />
                    <StatCard
                        title="Critical Issues"
                        value={stats?.critical_findings || 0}
                        subtitle="⚠️ ACTIVE PRIORITY ITEM"
                        icon={AlertTriangle}
                        variant="critical"
                    />
                    <StatCard
                        title="Risk Score"
                        value={calculateRiskScore()}
                        suffix="/100"
                        icon={TrendingUp}
                        variant="warning"
                    />
                    <StatCard
                        title="MTTR (Mean Time)"
                        value="4.2"
                        suffix="d"
                        subtitle="avg fix time"
                        icon={Clock}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Severity Distribution */}
                    <div className="lg:col-span-1">
                        <SeverityChart data={severityData} />
                    </div>

                    {/* Remediation Velocity */}
                    <div className="lg:col-span-1">
                        <RemediationVelocity data={trendData} />
                    </div>
                </div>

                {/* AI Insights */}
                <AIInsights />

                {/* Vulnerability Feed */}
                <VulnerabilityFeed />
            </div>
        </div>
    );
};

export default DashboardPage;
