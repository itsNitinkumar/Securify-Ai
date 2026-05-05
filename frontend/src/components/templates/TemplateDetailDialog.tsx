import React, { useState } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportApi } from '@/api/reportApi';
import { toast } from 'react-hot-toast';

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

interface TemplateDetailDialogProps {
  template: ReportTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const TemplateDetailDialog: React.FC<TemplateDetailDialogProps> = ({
  template,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || '',
    primary_color: template.template_data?.primary_color || '#00d639',
    secondary_color: template.template_data?.secondary_color || '#00ff41',
    company_name: template.template_data?.company_name || 'SecurifyAI',
  });

  // Reset form data when template changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: template.name,
        description: template.description || '',
        primary_color: template.template_data?.primary_color || '#00d639',
        secondary_color: template.template_data?.secondary_color || '#00ff41',
        company_name: template.template_data?.company_name || 'SecurifyAI',
      });
      setIsEditing(false);
    }
  }, [open, template]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await reportApi.updateTemplate(template.id, {
        name: formData.name,
        description: formData.description,
        template_data: {
          ...template.template_data,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          company_name: formData.company_name,
        },
      });
      toast.success('Template updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-gray-900">{template.name}</DialogTitle>
            {isEditing && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Editing Mode
              </span>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4">{isEditing ? (
            <>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Template Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white text-gray-900 border-gray-300"
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Company Name</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Primary Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-16 h-10 p-1 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1 bg-white text-gray-900 border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Secondary Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-16 h-10 p-1 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="flex-1 bg-white text-gray-900 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{template.description || 'No description provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                <p className="text-sm text-gray-600">
                  {template.is_default ? 'Default Template' : 'Custom Template'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Company Name</h3>
                <p className="text-sm text-gray-600">
                  {template.template_data?.company_name || 'SecurifyAI'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Primary Color</h3>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: template.template_data?.primary_color || '#00d639' }}
                    />
                    <p className="text-sm text-gray-600">{template.template_data?.primary_color || '#00d639'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Secondary Color</h3>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: template.template_data?.secondary_color || '#00ff41' }}
                    />
                    <p className="text-sm text-gray-600">{template.template_data?.secondary_color || '#00ff41'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Created</h3>
                <p className="text-sm text-gray-600">
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="border-gray-300 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-gray-300 text-gray-700"
                >
                  Close
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Template
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDetailDialog;
