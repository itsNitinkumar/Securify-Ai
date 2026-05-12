import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowLeft, FileText, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

interface ProjectFindings {
  projectId: number;
  projectName: string;
  findings: Finding[];
  selectedFindings: number[];
}

const ImportFindingsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFindings, setProjectFindings] = useState<ProjectFindings[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await projectApi.getAllProjects();
      const projectsList = (response.data || response).filter((p: Project) => p.id !== parseInt(projectId || '0'));
      setProjects(projectsList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadFindingsForProject = async (sourceProjectId: number) => {
    try {
      // Only fetch approved findings from the source project
      const response = await findingApi.getAllFindings({ project_id: sourceProjectId, status: 'approved' });
      const findingsList = response.data?.data || response.data || response;
      return Array.isArray(findingsList) ? findingsList : [];
    } catch (error) {
      console.error('Failed to load findings:', error);
      return [];
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const toggleProjectExpansion = async (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      if (!projectFindings.find(pf => pf.projectId === projectId)) {
        const findings = await loadFindingsForProject(projectId);
        const project = projects.find(p => p.id === projectId);
        setProjectFindings(prev => [...prev, {
          projectId,
          projectName: project?.name || `Project ${projectId}`,
          findings,
          selectedFindings: []
        }]);
      }
    }
    setExpandedProjects(newExpanded);
  };

  const toggleFinding = (projectId: number, findingId: number) => {
    setProjectFindings(prev => prev.map(pf => {
      if (pf.projectId !== projectId) return pf;
      const isSelected = pf.selectedFindings.includes(findingId);
      return {
        ...pf,
        selectedFindings: isSelected
          ? pf.selectedFindings.filter(id => id !== findingId)
          : [...pf.selectedFindings, findingId]
      };
    }));
  };

  const toggleSelectAllInProject = (projectId: number) => {
    setProjectFindings(prev => prev.map(pf => {
      if (pf.projectId !== projectId) return pf;
      const allSelected = pf.selectedFindings.length === pf.findings.length;
      return {
        ...pf,
        selectedFindings: allSelected ? [] : pf.findings.map(f => f.id)
      };
    }));
  };

  const getTotalSelected = () => {
    return projectFindings.reduce((sum, pf) => sum + pf.selectedFindings.length, 0);
  };

  const handleImportFindings = async () => {
    const totalSelected = getTotalSelected();
    if (totalSelected === 0) {
      toast.error('Please select at least one finding to import');
      return;
    }

    // Check for duplicates in target project
    try {
      const targetFindingsRes = await findingApi.getAllFindings({ project_id: parseInt(projectId || '0') });
      const targetFindingsData = targetFindingsRes.data?.data || targetFindingsRes.data || [];
      const targetFindings = Array.isArray(targetFindingsData) ? targetFindingsData : [];
      const targetTitles = new Set(targetFindings.map((f: Finding) => f.title.toLowerCase().trim()));

      const duplicates: string[] = [];
      for (const pf of projectFindings) {
        for (const findingId of pf.selectedFindings) {
          const sourceFinding = pf.findings.find(f => f.id === findingId);
          if (sourceFinding && targetTitles.has(sourceFinding.title.toLowerCase().trim())) {
            duplicates.push(sourceFinding.title);
          }
        }
      }

      if (duplicates.length > 0) {
        const uniqueDupes = [...new Set(duplicates)];
        toast.error(`These findings already exist in this project: ${uniqueDupes.join(', ')}`);
        return;
      }
    } catch (error) {
      console.error('Failed to check duplicates:', error);
    }

    setIsImporting(true);
    try {
      for (const pf of projectFindings) {
        for (const findingId of pf.selectedFindings) {
          const sourceFinding = pf.findings.find(f => f.id === findingId);
          if (!sourceFinding) continue;

          // Preserve likelihood/impact as-is (object or string) so full details are kept
          const likelihoodValue = sourceFinding.likelihood ?? undefined;
          const impactValue = sourceFinding.impact ?? undefined;

          await findingApi.create({
            title: sourceFinding.title,
            severity: sourceFinding.severity,
            description: sourceFinding.description || '',
            affected_target: sourceFinding.affected_target || '',
            affected_component: sourceFinding.affected_component || '',
            cvss_score: sourceFinding.cvss_score,
            cwe_id: sourceFinding.cwe_id || '',
            owasp_category: sourceFinding.owasp_category || '',
            likelihood: likelihoodValue,
            impact: impactValue,
            steps_to_reproduce: sourceFinding.steps_to_reproduce || [],
            recommendation: sourceFinding.recommendation || [],
            remediation: sourceFinding.remediation || '',
            proof_of_concept: sourceFinding.proof_of_concept || '',
            references: sourceFinding.references || [],
            tags: sourceFinding.tags || [],
            status: 'approved',
            project_id: parseInt(projectId || '0'),
          });
        }
      }
      
      toast.success(`Successfully imported ${totalSelected} finding(s)`);
      navigate(`/projects/${projectId}/report`, { state: { refresh: true } });
    } catch (error: any) {
      console.error('Failed to import findings:', error);
      const errorMsg = error?.response?.data?.message || 'Failed to import findings';
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const severityColors: Record<string, string> = {
    Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate(`/projects/${projectId}/report`)}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Report
      </Button>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">Import Findings from Other Projects</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Select findings from one or multiple projects. Imported findings will be added to this project.
        </p>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-surface-high border border-outline rounded-lg text-on-surface"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-3 mb-6">
          {isLoadingProjects ? (
            <div className="flex items-center gap-2 p-4 text-on-surface-variant">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading projects...
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map(project => {
              const pf = projectFindings.find(p => p.projectId === project.id);
              const isExpanded = expandedProjects.has(project.id);
              const projectSelectedCount = pf?.selectedFindings.length || 0;
              const projectTotalCount = pf?.findings.length || 0;

              return (
                <Card key={project.id} className="bg-surface-high border-outline overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-surface flex items-center justify-between"
                    onClick={() => toggleProjectExpansion(project.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-on-surface-variant" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                      )}
                      <div>
                        <div className="font-medium text-on-surface">{project.name}</div>
                        <div className="text-sm text-on-surface-variant">
                          {project.client_name || 'No client'} • {projectTotalCount} findings
                        </div>
                      </div>
                    </div>
                    {projectSelectedCount > 0 && (
                      <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                        {projectSelectedCount} selected
                      </span>
                    )}
                  </div>

                  {isExpanded && pf && (
                    <div className="border-t border-outline p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={projectSelectedCount === projectTotalCount && projectTotalCount > 0}
                            onChange={() => toggleSelectAllInProject(project.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-on-surface">Select All</span>
                        </label>
                      </div>
                      
                      {projectTotalCount > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {pf.findings.map(finding => (
                            <label
                              key={finding.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface cursor-pointer border border-transparent hover:border-outline"
                            >
                              <input
                                type="checkbox"
                                checked={pf.selectedFindings.includes(finding.id)}
                                onChange={() => toggleFinding(project.id, finding.id)}
                                className="w-4 h-4"
                              />
                              <div className="flex-1">
                                <div className="text-on-surface font-medium">{finding.title}</div>
                                <div className="text-xs text-on-surface-variant">{finding.affected_target || 'No target'}</div>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded ${severityColors[finding.severity] || ''}`}>
                                {finding.severity}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-on-surface-variant text-sm">No findings in this project</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <p className="text-on-surface-variant text-center py-8">No projects found</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-outline">
          <div className="text-on-surface-variant">
            {getTotalSelected()} finding(s) selected
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/report`)}
              className="border-outline text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportFindings}
              disabled={getTotalSelected() === 0 || isImporting}
              className="bg-primary text-surface hover:bg-primary/90 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Import {getTotalSelected() > 0 ? `(${getTotalSelected()})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportFindingsPage;
