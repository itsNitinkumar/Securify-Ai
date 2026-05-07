import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Star, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import axios from '@/api/axios';
import { toast } from 'react-hot-toast';

interface TemplateData {
  company_name?: string;
  header_text?: string;
  footer_text?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  sections?: Array<{
    type: string;
    title: string;
    enabled: boolean;
  }>;
}

interface Template {
  id: number;
  name: string;
  description?: string;
  template_data: TemplateData;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TemplateManagementPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/reports/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Template) => {
    try {
      await axios.put(`/reports/templates/${template.id}`, {
        name: template.name,
        description: template.description,
        template_data: template.template_data,
      });
      toast.success('Template updated successfully');
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleSetDefault = async (templateId: number) => {
    try {
      await axios.put(`/reports/templates/${templateId}`, {
        is_default: true,
      });
      toast.success('Default template updated');
      loadTemplates();
    } catch (error) {
      console.error('Failed to set default template:', error);
      toast.error('Failed to set default template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await axios.delete(`/reports/templates/${templateId}`);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Templates</h1>
            <p className="text-gray-600">Manage your report templates and customize branding</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                {template.is_default && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {template.description || 'No description provided'}
            </p>

            {/* Template Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Company:</span>
                <span className="font-medium text-gray-900">
                  {template.template_data.company_name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Primary Color:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: template.template_data.primary_color || '#00d639' }}
                  />
                  <span className="font-mono text-gray-900">
                    {template.template_data.primary_color || '#00d639'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingTemplate(template)}
                className="flex-1 border-gray-300 text-gray-700"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              {!template.is_default && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                    className="border-gray-300 text-gray-700"
                    title="Set as default"
                  >
                    <Star className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    title="Delete template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
};

export default TemplateManagementPage;
