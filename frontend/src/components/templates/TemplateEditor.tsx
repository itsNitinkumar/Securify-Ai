import React, { useState, useEffect } from 'react';
import { X, Save, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface TemplateEditorProps {
  template: Template;
  onSave: (template: Template) => void | Promise<void>;
  onCancel: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || '',
    company_name: template.template_data.company_name || 'SecurifyAI',
    primary_color: template.template_data.primary_color || '#00d639',
    secondary_color: template.template_data.secondary_color || '#00ff41',
    header_text: template.template_data.header_text || 'CONFIDENTIAL - Penetration Testing Report',
    footer_text: template.template_data.footer_text || 'This document contains confidential information',
    font_family: template.template_data.font_family || 'Arial',
  });

  const handleSubmit = () => {
    const updatedTemplate: Template = {
      ...template,
      name: formData.name,
      description: formData.description,
      template_data: {
        ...template.template_data,
        company_name: formData.company_name,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        header_text: formData.header_text,
        footer_text: formData.footer_text,
        font_family: formData.font_family,
      },
    };
    onSave(updatedTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Report Template</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Template Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., GDR report template"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Standard penetration testing report template with all essential sections"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Company Name
            </label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="SecurifyAI"
              className="w-full"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: formData.primary_color }}
                />
                <Input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#00d639"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: formData.secondary_color }}
                />
                <Input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="#11d414"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Header Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Header Text
            </label>
            <Input
              value={formData.header_text}
              onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              placeholder="CONFIDENTIAL - Penetration Testing Report"
              className="w-full"
            />
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Footer Text
            </label>
            <Input
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="This document contains confidential information"
              className="w-full"
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Font Family
            </label>
            <select
              value={formData.font_family}
              onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="border-gray-300 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
