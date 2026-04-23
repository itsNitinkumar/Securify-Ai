import { useState, useEffect } from 'react';
import { Plus, Search, FolderOpen, Calendar, User, AlertTriangle } from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import ProjectDetailDialog from '@/components/projects/ProjectDetailDialog';

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    loadProjects();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery, filter]);

  const loadCurrentUser = async () => {
    try {
      const response = await authApi.getProfile();
      setCurrentUserRole(response.data.data?.role || '');
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAllProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((p) => p.status === filter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.client_name?.toLowerCase().includes(query)
      );
    }

    setFilteredProjects(filtered);
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
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
          {/* Only Managers can create projects */}
          {currentUserRole === 'manager' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
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
            <span className="text-xs text-on-surface-variant uppercase">Active</span>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-primary font-technical">
            {stats.active}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Completed</span>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.completed}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Total Findings</span>
            <AlertTriangle className="w-4 h-4 text-error" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.totalFindings}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-high border-outline text-on-surface"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${
              filter === 'all'
                ? 'bg-primary text-surface'
                : 'border-outline text-on-surface-variant hover:border-primary'
            }`}
            onClick={() => setFilter('all')}
          >
            All Projects
          </Badge>
          <Badge
            variant={filter === 'active' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${
              filter === 'active'
                ? 'bg-primary text-surface'
                : 'border-outline text-on-surface-variant hover:border-primary'
            }`}
            onClick={() => setFilter('active')}
          >
            Active
          </Badge>
          <Badge
            variant={filter === 'completed' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-primary text-surface'
                : 'border-outline text-on-surface-variant hover:border-primary'
            }`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </Badge>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-on-surface-variant">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <FolderOpen className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">No projects found</h3>
          <p className="text-on-surface-variant mb-4">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : currentUserRole === 'manager'
              ? 'Get started by creating your first project'
              : 'No projects available yet'}
          </p>
          {!searchQuery && currentUserRole === 'manager' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadProjects}
      />

      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onUpdate={loadProjects}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
