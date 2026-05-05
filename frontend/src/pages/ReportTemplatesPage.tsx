import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Loader2 } from 'lucide-react';
import { reportApi } from '@/api/reportApi';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateDetailDialog from '@/components/templates/TemplateDetailDialog';
import CreateTemplateDialog from '@/components/templates/CreateTemplateDialog';

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  template_data: any;
  logo_path?: string;
  is_default: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

const ReportTemplatesPage = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getAllTemplates();
      setTemplates(response.data || response);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await reportApi.deleteTemplate(id);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleViewTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowDetailDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage and customize report templates for your penetration testing reports
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center bg-white">
          <p className="text-gray-600 mb-4">No templates found</p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={() => handleViewTemplate(template)}
              onEdit={() => {
                setSelectedTemplate(template);
                setShowDetailDialog(true);
              }}
              onDelete={() => handleDeleteTemplate(template.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedTemplate && (
        <TemplateDetailDialog
          template={selectedTemplate}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onUpdate={() => {
            loadTemplates();
            setShowDetailDialog(false);
          }}
        />
      )}

      {/* Create Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          loadTemplates();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
};

export default ReportTemplatesPage;
