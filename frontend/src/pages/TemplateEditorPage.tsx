import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { reportApi } from '@/api/reportApi';
import {
  buildTemplateContent,
  buildTemplatePayload,
  defaultTemplateContent,
  ReportTemplateContent,
  ReportTemplateRecord,
  TemplateSectionContent,
} from '@/components/templates/templateSchema';

type SectionKey = keyof ReportTemplateContent['sections'];

const sectionOrder: Array<{ key: SectionKey; label: string }> = [
  { key: 'table_of_contents', label: 'Table of Contents' },
  { key: 'confidentiality', label: 'Confidentiality' },
  { key: 'introduction', label: 'Introduction' },
  { key: 'approach', label: 'Approach' },
  { key: 'runtime_assessment', label: 'Runtime Assessment' },
  { key: 'scope', label: 'Scope' },
  { key: 'out_of_scope', label: 'Out of Scope' },
  { key: 'assessment_limitation', label: 'Assessment Limitation' },
  { key: 'findings_recommendation', label: 'Findings & Recommendation' },
  { key: 'risk_classification', label: 'Risk Classification' },
  { key: 'measurement_impact', label: 'Measurement of Impact' },
  { key: 'measurement_likelihood', label: 'Measurement of Likelihood' },
  { key: 'overall_risk', label: 'Overall Risk' },
  { key: 'zero_risk_issues', label: 'Zero-risk Issues' },
  { key: 'vulnerabilities', label: 'Vulnerabilities' },
  { key: 'summary', label: 'Summary' },
  { key: 'detailed_vulnerabilities', label: 'Detailed Vulnerabilities' },
  { key: 'appendix_a', label: 'Appendix A' },
];

const TemplateEditorPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const readOnly = modeParam === 'view';
  const [activeSection, setActiveSection] = useState<SectionKey>('table_of_contents');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<ReportTemplateRecord>({
    name: 'New Template',
    description: '',
    is_default: false,
    template_data: {},
  });
  const [content, setContent] = useState<ReportTemplateContent>(defaultTemplateContent());

  useEffect(() => {
    void load();
  }, [templateId]);

  const load = async () => {
    if (!templateId || templateId === 'new') {
      setTemplate({ name: 'New Template', description: '', is_default: false, template_data: {} });
      setContent(defaultTemplateContent());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await reportApi.getTemplate(Number.parseInt(templateId, 10));
      const loaded = (data.data || data) as ReportTemplateRecord;
      setTemplate(loaded);
      setContent(buildTemplateContent(loaded));
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const currentSection = content.sections[activeSection];

  const updateTemplateField = (field: keyof ReportTemplateRecord, value: any) => {
    setTemplate((current) => ({ ...current, [field]: value }));
  };

  const updateContent = (updater: (current: ReportTemplateContent) => ReportTemplateContent) => {
    setContent((current) => updater(current));
  };

  const updateSection = (sectionKey: SectionKey, updater: (section: TemplateSectionContent) => TemplateSectionContent) => {
    updateContent((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: updater(current.sections[sectionKey]),
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = buildTemplatePayload(template, content);
      if (templateId && templateId !== 'new' && template.id) {
        const updated = await reportApi.updateTemplate(template.id, payload as any);
        setTemplate((updated.data || updated) as ReportTemplateRecord);
        toast.success('Template updated');
      } else {
        const created = await reportApi.createTemplate(payload as any);
        const createdTemplate = (created.data || created) as ReportTemplateRecord;
        toast.success('Template created');
        navigate(`/templates/${createdTemplate.id}?mode=edit`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const renderFieldTable = (rows: Array<{ label: string; value: string; onChange: (value: string) => void; multiline?: boolean }>) => (
    <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
      <div className="grid grid-cols-[280px_1fr] border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
        <div>Field</div>
        <div>Value</div>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[280px_1fr] border-b border-gray-100 last:border-b-0">
          <div className="px-4 py-4 text-sm font-medium text-gray-700">{row.label}</div>
          <div className="px-4 py-3">
            {row.multiline ? (
              <textarea
                value={row.value}
                onChange={(event) => row.onChange(event.target.value)}
                rows={5}
                readOnly={readOnly}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-gray-300 bg-white text-gray-900 focus:border-green-500'}`}
              />
            ) : (
              <input
                value={row.value}
                onChange={(event) => row.onChange(event.target.value)}
                readOnly={readOnly}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${readOnly ? 'border-transparent bg-transparent text-gray-800' : 'border-gray-300 bg-white text-gray-900 focus:border-green-500'}`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderRowGrid = (
    title: string,
    rows: Array<Record<string, string>>,
    columns: Array<{ key: string; label: string }>,
    onChange: (rowIndex: number, key: string, value: string) => void,
    onAdd: () => void,
    onRemove: (rowIndex: number) => void,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-green-700">{title}</h3>
        {!readOnly ? (
          <Button type="button" onClick={onAdd} className="bg-green-600 text-white hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
        <div className={`grid border-b border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800`} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) ${readOnly ? '' : '64px'}` }}>
          {columns.map((column) => <div key={column.key}>{column.label}</div>)}
          {!readOnly ? <div>Action</div> : null}
        </div>
        {rows.map((row, rowIndex) => (
          <div key={`${title}-${rowIndex}`} className="grid items-center border-b border-gray-100 px-4 py-3 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) ${readOnly ? '' : '64px'}` }}>
            {columns.map((column) => (
              <div key={column.key} className="pr-3">
                <input
                  value={row[column.key] || ''}
                  onChange={(event) => onChange(rowIndex, column.key, event.target.value)}
                  readOnly={readOnly}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${readOnly ? 'border-transparent bg-transparent text-gray-800' : 'border-gray-300 bg-white text-gray-900 focus:border-green-500'}`}
                />
              </div>
            ))}
            {!readOnly ? (
              <button type="button" onClick={() => onRemove(rowIndex)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );

  const sectionEditor = useMemo(() => {
    if (activeSection === 'scope') {
      const scope = currentSection as TemplateSectionContent;
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: scope.title, onChange: (value) => updateSection('scope', (section) => ({ ...section, title: value })) },
            { label: 'Body Content', value: scope.body || '', onChange: (value) => updateSection('scope', (section) => ({ ...section, body: value })), multiline: true },
          ])}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Application details, user roles, and tools are managed per-project in the Project Details dialog. The template only controls the section title and description text.
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === 'table_of_contents') {
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: currentSection.title, onChange: (value) => updateSection('table_of_contents', (section) => ({ ...section, title: value })) },
          ])}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The table of contents is automatically generated from the document structure. This field only controls the section heading.
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === 'risk_classification') {
      const risk = currentSection as TemplateSectionContent;
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: risk.title, onChange: (value) => updateSection('risk_classification', (section) => ({ ...section, title: value })) },
            { label: 'Body Content', value: risk.body || '', onChange: (value) => updateSection('risk_classification', (section) => ({ ...section, body: value })), multiline: true },
          ])}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The risk matrix is a standard 3x3 grid showing Impact vs Likelihood. The matrix values are fixed and cannot be customized.
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === 'appendix_a') {
      const appendix = currentSection as TemplateSectionContent;
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: appendix.title, onChange: (value) => updateSection('appendix_a', (section) => ({ ...section, title: value })) },
            { label: 'Body Content', value: appendix.body || '', onChange: (value) => updateSection('appendix_a', (section) => ({ ...section, body: value })), multiline: true },
          ])}
        </div>
      );
    }

    // For most sections, just show title and body
    const fields = [
      { label: 'Section Title', value: currentSection.title, onChange: (value: string) => updateSection(activeSection, (section) => ({ ...section, title: value })) },
      { label: 'Body Content', value: currentSection.body || '', onChange: (value: string) => updateSection(activeSection, (section) => ({ ...section, body: value })), multiline: true },
    ];

    // Add list items field only if the section has items
    if (Array.isArray(currentSection.items) && currentSection.items.length > 0) {
      fields.push({
        label: 'List Items (one per line)',
        value: currentSection.items.join('\n'),
        onChange: (value: string) => updateSection(activeSection, (section) => ({ ...section, items: value.split('\n').map((item) => item.trim()).filter(Boolean) })),
        multiline: true,
      });
    }

    return (
      <div className="space-y-6">
        {renderFieldTable(fields)}
        {activeSection === 'out_of_scope' && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> Use the "List Items" field to define what's out of scope. Each line becomes a bullet point in the report.
            </p>
          </div>
        )}
      </div>
    );
  }, [activeSection, currentSection, readOnly]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] p-6 text-white">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate('/templates')} className="mb-3 px-0 text-gray-300 hover:bg-transparent hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold text-white">{templateId === 'new' ? 'Create Template' : template.name}</h1>
          <p className="mt-1 text-gray-300">Edit the static report content here. Dynamic finding content is injected automatically during report generation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setSearchParams({ mode: readOnly ? 'edit' : 'view' })}
            className="border-[#3a3a3a] bg-[#1a1a1a] text-gray-200 hover:bg-[#242424]"
          >
            {readOnly ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {readOnly ? 'Edit Mode' : 'View Mode'}
          </Button>
          {!readOnly ? (
            <Button onClick={() => void handleSave()} disabled={saving} className="bg-green-600 text-white hover:bg-green-700">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[#1f4d33] bg-[#15271d] px-4 py-3 text-sm text-[#b8f5c3]">
        Dynamic placeholders available in template content: <code>{'{{CLIENT_NAME}}'}</code>, <code>{'{{PROJECT_NAME}}'}</code>, <code>{'{{DATE}}'}</code>. Keep these placeholders in the template text where you want report generation to replace them automatically.
      </div>

      <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-6">
        <Card className="h-fit overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] p-0 text-white">
          <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
            <h2 className="text-lg font-semibold text-white">Document Tabs</h2>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => setActiveSection('table_of_contents')}
              className={`mb-3 flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium ${activeSection === 'table_of_contents' ? 'bg-[#1b3a2a] text-[#9cff93]' : 'text-gray-300 hover:bg-[#202020]'}`}
            >
              Tab 1
            </button>
            <div className="space-y-1 border-l border-[#2f2f2f] pl-4">
              {sectionOrder.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${activeSection === section.key ? 'bg-[#1b3a2a] font-semibold text-[#9cff93]' : 'text-gray-300 hover:bg-[#202020]'}`}
                >
                  {content.sections[section.key].title || section.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border border-[#2a2a2a] bg-[#1a1a1a] p-6 text-white">
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-gray-200">Template Name</label>
              <input
                value={template.name}
                onChange={(event) => updateTemplateField('name', event.target.value)}
                readOnly={readOnly}
                placeholder="e.g., Standard Penetration Test Report"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-gray-200">Description</label>
              <textarea
                value={template.description || ''}
                onChange={(event) => updateTemplateField('description', event.target.value)}
                rows={2}
                readOnly={readOnly}
                placeholder="Brief description of this template"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
              />
            </div>

            {sectionEditor}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorPage;
