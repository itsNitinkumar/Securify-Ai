import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Pencil, Save, Zap } from 'lucide-react';
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
import RichTextEditor from '@/components/templates/RichTextEditor';
import TableEditor from '@/components/templates/TableEditor';

type SectionKey = string;

const DYNAMIC_SECTIONS_BY_KEY: Record<string, string[]> = {
  blueally: ['detailed_vulnerabilities'],
  dast: ['detailed_vulnerabilities', 'summary', 'true_positive', 'false_positive'],
  securify: ['detailed_vulnerabilities'],
};

const isDynamicSection = (key: string, templateKey?: string): boolean => {
  const dynamicList = DYNAMIC_SECTIONS_BY_KEY[templateKey || ''] || DYNAMIC_SECTIONS_BY_KEY.securify;
  return dynamicList.includes(key);
};

const TemplateEditorPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const readOnly = modeParam === 'view';
  const [activeSection, setActiveSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<ReportTemplateRecord>({
    name: 'New Template',
    description: '',
    is_default: false,
    template_data: {},
  });
  const [content, setContent] = useState<ReportTemplateContent>(defaultTemplateContent());
  const templateKey = String(template.template_data?.key || '').toLowerCase();
  const templateName = String(template.name || '').toLowerCase();
  const isProfessionalTemplate = templateKey === 'securify'
    || templateKey === 'unknown'
    || templateName.includes('securify')
    || templateName.includes('professional');
  const visibleSectionKeys = useMemo(() => {
    return Object.keys(content.sections).filter((key) => {
      if (!isProfessionalTemplate) return true;
      return key !== 'table_of_contents' && key !== 'out_of_scope';
    });
  }, [content.sections, isProfessionalTemplate]);

  useEffect(() => {
    void load();
  }, [templateId]);

  const load = async () => {
    if (!templateId || templateId === 'new') {
      setTemplate({ name: 'New Template', description: '', is_default: false, template_data: {} });
      const fresh = defaultTemplateContent();
      setContent(fresh);
      setActiveSection(Object.keys(fresh.sections).filter((key) => key !== 'table_of_contents' && key !== 'out_of_scope')[0] || '');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await reportApi.getTemplate(Number.parseInt(templateId, 10));
      const loaded = (data.data || data) as ReportTemplateRecord;
      setTemplate(loaded);
      const built = buildTemplateContent(loaded);
      setContent(built);
      const loadedName = String(loaded.name || '').toLowerCase();
      const loadedIsProfessional = String((loaded as any)?.template_data?.key || '').toLowerCase() === 'securify'
        || loadedName.includes('securify')
        || loadedName.includes('professional');
      setActiveSection(Object.keys(built.sections).filter((key) => !loadedIsProfessional || (key !== 'table_of_contents' && key !== 'out_of_scope'))[0] || '');
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

  const updateSection = (sectionKey: string, updater: (section: TemplateSectionContent) => TemplateSectionContent) => {
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

  const sectionEditor = useMemo(() => {
    if (!activeSection || !currentSection || !visibleSectionKeys.includes(activeSection)) return null;
    if (isDynamicSection(activeSection, templateKey)) {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-800">Runtime Generated Section</h3>
              <p className="text-sm text-blue-600">
                This section is populated automatically from findings during report generation.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const sectionData = currentSection as TemplateSectionContent;
    const sectionTables = sectionData.tables || [];

    const editorContent = (() => {
      if (sectionData.rich_body) return sectionData.rich_body;
      const blocks: any[] = [];
      if (sectionData.body) {
        for (const para of sectionData.body.split('\n').filter(Boolean)) {
          if (para.startsWith('- ')) {
            blocks.push({ type: 'bulletListItem', content: [{ type: 'text', text: para.substring(2) }] });
          } else {
            blocks.push({ type: 'paragraph', content: [{ type: 'text', text: para }] });
          }
        }
      }
      if (Array.isArray(sectionData.items) && sectionData.items.length) {
        for (const item of sectionData.items) {
          blocks.push({ type: 'bulletListItem', content: [{ type: 'text', text: item }] });
        }
      }
      return blocks.length ? blocks : [{ type: 'paragraph', content: [] }];
    })();

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-200">Section Title</label>
          <input
            value={currentSection.title}
            onChange={(e) => updateSection(activeSection, (s) => ({ ...s, title: e.target.value }))}
            readOnly={readOnly}
            placeholder="Section heading"
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
              readOnly ? 'border-white/10 bg-[#171717] text-slate-300' : 'border-white/10 bg-[#171717] text-slate-100 focus:border-green-500'
            }`}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-200">Content</label>
          <div className="rounded-lg border border-white/10">
            <RichTextEditor
              key={activeSection}
              content={editorContent}
              onChange={(json, plain) => {
                updateSection(activeSection, (s) => ({
                  ...s,
                  rich_body: json,
                  body: plain,
                }));
              }}
              readOnly={readOnly}
              placeholder="Start typing content..."
            />
          </div>
        </div>

        {sectionTables.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-4">
            <label className="mb-3 block text-sm font-semibold text-slate-200">Tables</label>
            <TableEditor
              tables={sectionTables}
              onChange={(tables) => {
                updateSection(activeSection, (s) => ({ ...s, tables }));
              }}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>
    );
  }, [activeSection, currentSection, readOnly, templateKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] p-6 text-slate-100">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate('/templates')} className="mb-3 px-0 text-slate-400 hover:bg-transparent hover:text-slate-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold text-slate-100">{templateId === 'new' ? 'Create Template' : template.name}</h1>
          <p className="mt-1 text-slate-400">Edit the static report content here. Dynamic finding content is injected automatically during report generation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setSearchParams({ mode: readOnly ? 'edit' : 'view' })}
            className="border border-white/10 bg-[#1a1a1a] text-slate-200 hover:bg-[#232323]"
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

      <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
        Dynamic placeholders available: <code className="rounded bg-green-500/15 px-1.5 py-0.5 font-mono text-xs text-green-100">{'{{CLIENT_NAME}}'}</code>,{' '}
        <code className="rounded bg-green-500/15 px-1.5 py-0.5 font-mono text-xs text-green-100">{'{{PROJECT_NAME}}'}</code>,{' '}
        <code className="rounded bg-green-500/15 px-1.5 py-0.5 font-mono text-xs text-green-100">{'{{DATE}}'}</code>.
      </div>

      <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-6">
        <Card className="h-fit overflow-hidden border border-white/10 bg-[#171717] p-0">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-200">Sections</h2>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
            {visibleSectionKeys.map((key) => {
              const section = content.sections[key];
              const isDynamic = isDynamicSection(key, templateKey);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    activeSection === key
                      ? 'bg-green-500/10 font-semibold text-green-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <span className="truncate">{section.title || key}</span>
                  {isDynamic && (
                    <span className="ml-2 shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-200">
                      Runtime
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border border-white/10 bg-[#171717] p-6">
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-200">Template Name</label>
              <input
                value={template.name}
                onChange={(e) => updateTemplateField('name', e.target.value)}
                readOnly={readOnly}
                placeholder="e.g., Standard Penetration Test Report"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${
                  readOnly ? 'border-white/10 bg-[#0f0f0f] text-slate-300' : 'border-white/10 bg-[#0f0f0f] text-slate-100 focus:border-green-500'
                }`}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-200">Description</label>
              <textarea
                value={template.description || ''}
                onChange={(e) => updateTemplateField('description', e.target.value)}
                rows={2}
                readOnly={readOnly}
                placeholder="Brief description of this template"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${
                  readOnly ? 'border-white/10 bg-[#0f0f0f] text-slate-300' : 'border-white/10 bg-[#0f0f0f] text-slate-100 focus:border-green-500'
                }`}
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
