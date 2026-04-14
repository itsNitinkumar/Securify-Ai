import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { dashboardApi, RecentActivity } from '@/api/dashboardApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ActivityLogTable from '@/components/activity/ActivityLogTable';
import ActivityFilters from '@/components/activity/ActivityFilters';

const ActivityLogsPage = () => {
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<RecentActivity[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: 'all',
        entityType: 'all',
        timeRange: '24h',
    });

    useEffect(() => {
        loadActivities();
    }, []);

    useEffect(() => {
        filterActivities();
    }, [activities, searchQuery, filters]);

    const loadActivities = async () => {
        try {
            setLoading(true);
            const response = await dashboardApi.getRecentActivity(100);
            setActivities(response.data);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterActivities = () => {
        let filtered = activities;

        // Filter by action
        if (filters.action !== 'all') {
            filtered = filtered.filter((a) => a.action.toLowerCase().includes(filters.action));
        }

        // Filter by entity type
        if (filters.entityType !== 'all') {
            filtered = filtered.filter((a) => a.entity_type === filters.entityType);
        }

        // Filter by time range
        if (filters.timeRange !== 'all') {
            const now = new Date();
            const timeRanges: Record<string, number> = {
                '1h': 1 * 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
            };
            const range = timeRanges[filters.timeRange];
            if (range) {
                filtered = filtered.filter((a) => {
                    const activityTime = new Date(a.timestamp).getTime();
                    return now.getTime() - activityTime <= range;
                });
            }
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (a) =>
                    a.user_name.toLowerCase().includes(query) ||
                    a.action.toLowerCase().includes(query) ||
                    a.entity_type.toLowerCase().includes(query) ||
                    (a.details && JSON.stringify(a.details).toLowerCase().includes(query))
            );
        }

        setFilteredActivities(filtered);
    };

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].join(','),
            ...filteredActivities.map((a) =>
                [
                    a.timestamp,
                    a.user_name,
                    a.action,
                    a.entity_type,
                    a.entity_id,
                    a.ip_address,
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-logs-${new Date().toISOString()}.csv`;
        link.click();
    };

    const stats = {
        total: activities.length,
        today: activities.filter((a) => {
            const today = new Date().setHours(0, 0, 0, 0);
            return new Date(a.timestamp).getTime() >= today;
        }).length,
        users: new Set(activities.map((a) => a.user_id)).size,
    };

    return (
        <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Activity className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                                Activity Logs
                            </h1>
                        </div>
                        <p className="text-sm md:text-base text-on-surface-variant">
                            Monitor user actions and system events across the platform
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={loadActivities}
                            className="border-outline text-on-surface-variant hover:text-primary"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                        <Button
                            onClick={handleExport}
                            className="bg-primary text-surface hover:bg-primary/90"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-surface-high border-outline">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-on-surface-variant uppercase">Total Events</span>
                        <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
                        {stats.total}
                    </div>
                </Card>

                <Card className="p-4 bg-surface-high border-outline">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-on-surface-variant uppercase">Today</span>
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-primary font-technical">
                        {stats.today}
                    </div>
                </Card>

                <Card className="p-4 bg-surface-high border-outline">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-on-surface-variant uppercase">Active Users</span>
                        <Badge variant="outline" className="text-xs border-outline-variant">
                            {stats.users}
                        </Badge>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
                        {stats.users}
                    </div>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="p-4 md:p-6 bg-surface-high border-outline mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                        <Input
                            type="text"
                            placeholder="Search activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-surface border-outline text-on-surface"
                        />
                    </div>
                    <ActivityFilters filters={filters} onFiltersChange={setFilters} />
                </div>
            </Card>

            {/* Activity Table */}
            {loading ? (
                <Card className="p-12 text-center bg-surface-high border-outline">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-on-surface-variant">Loading activities...</p>
                </Card>
            ) : filteredActivities.length === 0 ? (
                <Card className="p-12 text-center bg-surface-high border-outline">
                    <Activity className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-on-surface mb-2">No activities found</h3>
                    <p className="text-on-surface-variant">
                        {searchQuery || filters.action !== 'all' || filters.entityType !== 'all'
                            ? 'Try adjusting your filters'
                            : 'No activity logs available'}
                    </p>
                </Card>
            ) : (
                <ActivityLogTable activities={filteredActivities} />
            )}
        </div>
    );
};

export default ActivityLogsPage;
