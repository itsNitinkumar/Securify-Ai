import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, Calendar, AlertTriangle } from 'lucide-react';
import { projectApi, Project, ProjectFilters } from '@/api/projectApi';
import { clientApi, Client } from '@/api/clientApi';
import { userApi } from '@/api/userApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProjectCard from '@/components/projects/ProjectCard';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

const PROJECT_STATUSES = ['draft', 'pending_review', 'pending_comment_resolution', 'completed'];

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [selectedReporterId, setSelectedReporterId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  const [clients, setClients] = useState<Client[]>([]);
  const [reporters, setReporters] = useState<User[]>([]);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [selectedClientId, selectedStatus, selectedReporterId, startDate, endDate, searchQuery]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const filters: ProjectFilters = {};
      if (selectedClientId) filters.client_id = selectedClientId;
      if (selectedStatus) filters.status = selectedStatus;
      if (selectedReporterId) filters.assigned_reporter_id = selectedReporterId;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
      if (searchQuery) filters.search = searchQuery;
      const response = await projectApi.getAllProjects(filters);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterData = async () => {
    try {
      const [clientsRes, reportersRes] = await Promise.allSettled([
        clientApi.listClients(),
        userApi.getReporters(),
      ]);
      if (clientsRes.status === 'fulfilled') {
        const data = (clientsRes.value as any)?.data || clientsRes.value;
        setClients(Array.isArray(data) ? data : []);
      }
      if (reportersRes.status === 'fulfilled') {
        const data = (reportersRes.value as any)?.data?.data || (reportersRes.value as any)?.data || [];
        setReporters(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const clearFilters = () => {
    setSelectedClientId(undefined);
    setSelectedStatus(undefined);
    setSelectedReporterId(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedClientId || selectedStatus || selectedReporterId || startDate || endDate || searchQuery;

  const stats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === 'draft' || !p.status).length,
    pendingReview: projects.filter((p) => p.status === 'pending_review').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    totalFindings: projects.reduce((sum, p) => sum + (p.findings_count || 0), 0),
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                Projects & Assets
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              Manage penetration testing projects and track security assessments
            </p>
          </div>
          {hasPermission('create_projects') && (
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-primary text-surface hover:bg-primary/90 w-full md:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Total Projects</span>
            <FolderOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.total}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Draft</span>
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.draft}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Pending Review</span>
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-yellow-400 font-technical">
            {stats.pendingReview}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Completed</span>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-green-500 font-technical">
            {stats.completed}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-high border-outline text-on-surface text-sm"
            />
          </div>

          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-surface-high border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || undefined)}
            className="px-3 py-2 bg-surface-high border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>

          <select
            value={selectedReporterId || ''}
            onChange={(e) => setSelectedReporterId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 bg-surface-high border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Reporters</option>
            {reporters.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-on-surface-variant whitespace-nowrap">Start Date:</label>
            <Input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value || undefined)}
              className="bg-surface-high border-outline text-on-surface text-sm w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-on-surface-variant whitespace-nowrap">End Date:</label>
            <Input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value || undefined)}
              className="bg-surface-high border-outline text-on-surface text-sm w-40"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-primary hover:text-primary/80 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-on-surface-variant">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <FolderOpen className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">No projects found</h3>
          <p className="text-on-surface-variant mb-4">
            {searchQuery || hasActiveFilters
              ? 'Try adjusting your search criteria'
              : hasPermission('create_projects')
              ? 'Get started by creating your first project'
              : 'No projects available yet'}
          </p>
          {!searchQuery && !hasActiveFilters && hasPermission('create_projects') && (
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
