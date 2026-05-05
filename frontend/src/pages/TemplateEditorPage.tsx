import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Eye, Edit2 } from 'lucide-react';
import { reportApi } from '@/api/reportApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

interface TemplateSection {
  name: string;
  content: string;
  editable: boolean;
}

interface TemplateData {
  id?: number;
  name: string;
  description?: string;
  logo_path?: string;
  is_default?: boolean;
  confidentiality_text?: string;
  introduction_text?: string;
  approach_text?: string;
  scope_text?: string;
  scope_applications?: any[];
  scope_user_roles?: any[];
  scope_tools?: any[];
  appendix_text?: string;
  highlight_color?: string;
}

const TemplateEditorPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateData>({
    name: 'New Template',
    highlight_color: '#ffff00',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (templateId && templateId !== 'new') {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getTemplate(parseInt(templateId!));
      setTemplate(response.data);
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (template.id) {
        await reportApi.updateTemplate(template.id, template as any);
        toast.success('Template updated successfully');
      } else {
        const createData = {
          ...template,
          template_data: JSON.stringify(template)
        };
        await reportApi.createTemplate(createData as any);
        toast.success('Template created successfully');
        navigate('/templates');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setTemplate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTableRow = (section: string, index: number, field: string, value: string) => {
    const key = `scope_${section}` as keyof TemplateData;
    const data = (template[key] as any[]) || [];
    data[index] = { ...data[index], [field]: value };
    updateField(key, data);
  };

  const addTableRow = (section: string) => {
    const key = `scope_${section}` as keyof TemplateData;
    const data = (template[key] as any[]) || [];
    data.push({});
    updateField(key, data);
  };

  const removeTableRow = (section: string, index: number) => {
    const key = `scope_${section}` as keyof TemplateData;
    const data = (template[key] as any[]) || [];
    data.splice(index, 1);
    updateField(key, data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/templates')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Template Editor</h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          {['basic', 'confidentiality', 'introduction', 'approach', 'scope', 'appendix'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white">
            {/* Basic Settings */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={template.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={template.logo_path || ''}
                    onChange={(e) => updateField('logo_path', e.target.value)}
                    placeholder="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highlight Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={template.highlight_color || '#ffff00'}
                      onChange={(e) => updateField('highlight_color', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={template.highlight_color || '#ffff00'}
                      onChange={(e) => updateField('highlight_color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={template.is_default || false}
                    onChange={(e) => updateField('is_default', e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                    Set as default template
                  </label>
                </div>
              </div>
            )}

            {/* Confidentiality */}
            {activeTab === 'confidentiality' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidentiality and Distribution Restrictions
                </label>
                <textarea
                  value={template.confidentiality_text || ''}
                  onChange={(e) => updateField('confidentiality_text', e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  placeholder="Enter confidentiality text..."
                />
              </div>
            )}

            {/* Introduction */}
            {activeTab === 'introduction' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Introduction
                </label>
                <textarea
                  value={template.introduction_text || ''}
                  onChange={(e) => updateField('introduction_text', e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  placeholder="Enter introduction text..."
                />
              </div>
            )}

            {/* Approach */}
            {activeTab === 'approach' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approach
                </label>
                <textarea
                  value={template.approach_text || ''}
                  onChange={(e) => updateField('approach_text', e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  placeholder="Enter approach text..."
                />
              </div>
            )}

            {/* Scope */}
            {activeTab === 'scope' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope Description
                  </label>
                  <textarea
                    value={template.scope_text || ''}
                    onChange={(e) => updateField('scope_text', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  />
                </div>

                {/* Applications Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Application Details</h3>
                    <Button
                      size="sm"
                      onClick={() => addTableRow('applications')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-green-600 text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">URL</th>
                          <th className="px-4 py-2 text-center w-10">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(template.scope_applications || []).map((app, idx) => (
                          <tr key={idx} className="border-t border-gray-300">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={app.name || ''}
                                onChange={(e) => updateTableRow('applications', idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={app.url || ''}
                                onChange={(e) => updateTableRow('applications', idx, 'url', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => removeTableRow('applications', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Roles Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">User Roles</h3>
                    <Button
                      size="sm"
                      onClick={() => addTableRow('user_roles')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-green-600 text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">Role</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-center w-10">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(template.scope_user_roles || []).map((role, idx) => (
                          <tr key={idx} className="border-t border-gray-300">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={role.role || ''}
                                onChange={(e) => updateTableRow('user_roles', idx, 'role', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={role.description || ''}
                                onChange={(e) => updateTableRow('user_roles', idx, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => removeTableRow('user_roles', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tools Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Tools Used</h3>
                    <Button
                      size="sm"
                      onClick={() => addTableRow('tools')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-green-600 text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">Tool Name</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-center w-10">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(template.scope_tools || []).map((tool, idx) => (
                          <tr key={idx} className="border-t border-gray-300">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={tool.name || ''}
                                onChange={(e) => updateTableRow('tools', idx, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={tool.description || ''}
                                onChange={(e) => updateTableRow('tools', idx, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => removeTableRow('tools', idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Appendix */}
            {activeTab === 'appendix' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appendix A - Verification Requirements
                </label>
                <textarea
                  value={template.appendix_text || ''}
                  onChange={(e) => updateField('appendix_text', e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-mono text-sm"
                  placeholder="Enter appendix text..."
                />
              </div>
            )}
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-4 bg-white sticky top-6">
            <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Template Name</p>
                <p className="font-medium text-gray-900">{template.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Highlight Color</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: template.highlight_color || '#ffff00' }}
                  />
                  <p className="font-mono text-gray-900">{template.highlight_color}</p>
                </div>
              </div>
              {template.logo_path && (
                <div>
                  <p className="text-gray-600 mb-2">Logo Preview</p>
                  <img
                    src={template.logo_path}
                    alt="Logo"
                    className="max-w-full h-auto"
                    onError={() => <p className="text-red-600 text-xs">Logo failed to load</p>}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorPage;
