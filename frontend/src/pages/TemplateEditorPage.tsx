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
            { label: 'Scope Description', value: scope.body || '', onChange: (value) => updateSection('scope', (section) => ({ ...section, body: value })), multiline: true },
            { label: 'Application Details Title', value: scope.fields?.application_details_title || '', onChange: (value) => updateSection('scope', (section) => ({ ...section, fields: { ...(section.fields || {}), application_details_title: value } })) },
            { label: 'User Roles Title', value: scope.fields?.user_roles_title || '', onChange: (value) => updateSection('scope', (section) => ({ ...section, fields: { ...(section.fields || {}), user_roles_title: value } })) },
            { label: 'Tools Title', value: scope.fields?.tools_title || '', onChange: (value) => updateSection('scope', (section) => ({ ...section, fields: { ...(section.fields || {}), tools_title: value } })) },
          ])}

          {renderRowGrid(
            scope.fields?.application_details_title || 'Application Details',
            scope.application_rows || [],
            [
              { key: 'name', label: 'Name' },
              { key: 'url', label: 'URL' },
            ],
            (rowIndex, key, value) => updateSection('scope', (section) => {
              const next = [...(section.application_rows || [])];
              next[rowIndex] = { ...next[rowIndex], [key]: value };
              return { ...section, application_rows: next };
            }),
            () => updateSection('scope', (section) => ({ ...section, application_rows: [...(section.application_rows || []), { name: '', url: '' }] })),
            (rowIndex) => updateSection('scope', (section) => ({ ...section, application_rows: (section.application_rows || []).filter((_, idx) => idx !== rowIndex) })),
          )}

          {renderRowGrid(
            scope.fields?.user_roles_title || 'User Roles (Web application & API)',
            scope.user_role_rows || [],
            [
              { key: 'role', label: 'Role' },
              { key: 'description', label: 'Description' },
            ],
            (rowIndex, key, value) => updateSection('scope', (section) => {
              const next = [...(section.user_role_rows || [])];
              next[rowIndex] = { ...next[rowIndex], [key]: value };
              return { ...section, user_role_rows: next };
            }),
            () => updateSection('scope', (section) => ({ ...section, user_role_rows: [...(section.user_role_rows || []), { role: '', description: '' }] })),
            (rowIndex) => updateSection('scope', (section) => ({ ...section, user_role_rows: (section.user_role_rows || []).filter((_, idx) => idx !== rowIndex) })),
          )}

          {renderRowGrid(
            scope.fields?.tools_title || 'Tools',
            scope.tool_rows || [],
            [
              { key: 'name', label: 'Tool Name' },
              { key: 'description', label: 'Description' },
            ],
            (rowIndex, key, value) => updateSection('scope', (section) => {
              const next = [...(section.tool_rows || [])];
              next[rowIndex] = { ...next[rowIndex], [key]: value };
              return { ...section, tool_rows: next };
            }),
            () => updateSection('scope', (section) => ({ ...section, tool_rows: [...(section.tool_rows || []), { name: '', description: '' }] })),
            (rowIndex) => updateSection('scope', (section) => ({ ...section, tool_rows: (section.tool_rows || []).filter((_, idx) => idx !== rowIndex) })),
          )}
        </div>
      );
    }

    if (activeSection === 'table_of_contents') {
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: currentSection.title, onChange: (value) => updateSection('table_of_contents', (section) => ({ ...section, title: value })) },
          ])}
          {renderRowGrid(
            'Static Section Outline',
            (currentSection.items || []).map((item) => ({ item })),
            [{ key: 'item', label: 'Section / Subsection' }],
            (rowIndex, _key, value) => updateSection('table_of_contents', (section) => {
              const next = [...(section.items || [])];
              next[rowIndex] = value;
              return { ...section, items: next };
            }),
            () => updateSection('table_of_contents', (section) => ({ ...section, items: [...(section.items || []), 'New Section'] })),
            (rowIndex) => updateSection('table_of_contents', (section) => ({ ...section, items: (section.items || []).filter((_, idx) => idx !== rowIndex) })),
          )}
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
            { label: 'Matrix Title', value: risk.fields?.matrix_title || '', onChange: (value) => updateSection('risk_classification', (section) => ({ ...section, fields: { ...(section.fields || {}), matrix_title: value } })) },
            { label: 'Matrix Subtitle', value: risk.fields?.matrix_subtitle || '', onChange: (value) => updateSection('risk_classification', (section) => ({ ...section, fields: { ...(section.fields || {}), matrix_subtitle: value } })) },
          ])}
          {renderRowGrid(
            'Risk Matrix',
            risk.matrix_rows || [],
            [
              { key: 'low', label: 'Low Likelihood' },
              { key: 'medium', label: 'Medium Likelihood' },
              { key: 'high', label: 'High Likelihood' },
            ],
            (rowIndex, key, value) => updateSection('risk_classification', (section) => {
              const next = [...(section.matrix_rows || [])];
              next[rowIndex] = { ...next[rowIndex], [key]: value };
              return { ...section, matrix_rows: next };
            }),
            () => updateSection('risk_classification', (section) => ({ ...section, matrix_rows: [...(section.matrix_rows || []), { low: '', medium: '', high: '' }] })),
            (rowIndex) => updateSection('risk_classification', (section) => ({ ...section, matrix_rows: (section.matrix_rows || []).filter((_, idx) => idx !== rowIndex) })),
          )}
        </div>
      );
    }

    if (activeSection === 'appendix_a') {
      const appendix = currentSection as TemplateSectionContent;
      return (
        <div className="space-y-6">
          {renderFieldTable([
            { label: 'Section Title', value: appendix.title, onChange: (value) => updateSection('appendix_a', (section) => ({ ...section, title: value })) },
            { label: 'Introductory Text', value: appendix.body || '', onChange: (value) => updateSection('appendix_a', (section) => ({ ...section, body: value })), multiline: true },
          ])}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-green-700">Appendix Entries</h3>
              {!readOnly ? (
                <Button
                  type="button"
                  onClick={() => updateSection('appendix_a', (section) => ({ ...section, appendix_entries: [...(section.appendix_entries || []), { title: 'Appendix', body: '' }] }))}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Appendix
                </Button>
              ) : null}
            </div>
            {(appendix.appendix_entries || []).map((entry, rowIndex) => (
              <div key={`appendix-${rowIndex}`} className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Appendix {rowIndex + 1}</span>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => updateSection('appendix_a', (section) => ({ ...section, appendix_entries: (section.appendix_entries || []).filter((_, idx) => idx !== rowIndex) }))}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <input
                    value={entry.title || ''}
                    onChange={(event) => updateSection('appendix_a', (section) => {
                      const next = [...(section.appendix_entries || [])];
                      next[rowIndex] = { ...next[rowIndex], title: event.target.value };
                      return { ...section, appendix_entries: next };
                    })}
                    readOnly={readOnly}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${readOnly ? 'border-transparent bg-transparent text-gray-800' : 'border-gray-300 bg-white text-gray-900 focus:border-green-500'}`}
                  />
                  <textarea
                    value={entry.body || ''}
                    onChange={(event) => updateSection('appendix_a', (section) => {
                      const next = [...(section.appendix_entries || [])];
                      next[rowIndex] = { ...next[rowIndex], body: event.target.value };
                      return { ...section, appendix_entries: next };
                    })}
                    rows={4}
                    readOnly={readOnly}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-gray-300 bg-white text-gray-900 focus:border-green-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return renderFieldTable([
      { label: 'Section Title', value: currentSection.title, onChange: (value) => updateSection(activeSection, (section) => ({ ...section, title: value })) },
      { label: 'Body Content', value: currentSection.body || '', onChange: (value) => updateSection(activeSection, (section) => ({ ...section, body: value })), multiline: true },
      ...(currentSection.fields ? Object.entries(currentSection.fields).map(([fieldKey, fieldValue]) => ({
        label: fieldKey.replace(/_/g, ' '),
        value: fieldValue,
        onChange: (value: string) => updateSection(activeSection, (section) => ({ ...section, fields: { ...(section.fields || {}), [fieldKey]: value } })),
      })) : []),
      ...(Array.isArray(currentSection.items) ? [{
        label: 'List Items',
        value: currentSection.items.join('\n'),
        onChange: (value: string) => updateSection(activeSection, (section) => ({ ...section, items: value.split('\n').map((item) => item.trim()).filter(Boolean) })),
        multiline: true,
      }] : []),
    ]);
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
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">Template Name</label>
                <input
                  value={template.name}
                  onChange={(event) => updateTemplateField('name', event.target.value)}
                  readOnly={readOnly}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">Company Name</label>
                <input
                  value={content.company_name}
                  onChange={(event) => updateContent((current) => ({ ...current, company_name: event.target.value }))}
                  readOnly={readOnly}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">Description</label>
                <textarea
                  value={template.description || ''}
                  onChange={(event) => updateTemplateField('description', event.target.value)}
                  rows={3}
                  readOnly={readOnly}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">Logo URL</label>
                  <input
                    value={content.logo_path}
                    onChange={(event) => updateContent((current) => ({ ...current, logo_path: event.target.value }))}
                    readOnly={readOnly}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">Cover Subtitle</label>
                  <input
                    value={content.cover_subtitle}
                    onChange={(event) => updateContent((current) => ({ ...current, cover_subtitle: event.target.value }))}
                    readOnly={readOnly}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${readOnly ? 'border-[#2f2f2f] bg-[#202020] text-gray-300' : 'border-[#3a3a3a] bg-[#202020] text-white focus:border-green-500'}`}
                  />
                </div>
              </div>
            </div>

            {sectionEditor}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorPage;
