import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Loader2, MoreVertical, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { reportApi, ReportTemplate } from '@/api/reportApi';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { buildTemplateContent } from '@/components/templates/templateSchema';

const ReportTemplatesPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuTemplateId, setMenuTemplateId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuTemplateId(null);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await reportApi.getAllTemplates();
      setTemplates(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template: ReportTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      await reportApi.deleteTemplate(template.id);
      toast.success('Template deleted');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleSetDefault = async (template: ReportTemplate) => {
    try {
      await reportApi.updateTemplate(template.id, { is_default: true } as any);
      toast.success('Default template updated');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to set default template:', error);
      toast.error('Failed to update default template');
    }
  };

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
          <h1 className="text-3xl font-bold text-white">Report Templates</h1>
          <p className="mt-1 text-gray-300">Manage the static report content that will be rendered into generated reports.</p>
        </div>
        <Button onClick={() => navigate('/templates/new')} className="bg-green-600 text-white hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-sm overflow-visible">
        <div className="grid grid-cols-[minmax(260px,2fr)_minmax(240px,1.8fr)_160px_160px_56px] border-b border-[#2a2a2a] bg-[#202020] px-4 py-3 text-sm font-semibold text-[#c8ffd7]">
          <div>Name</div>
          <div>Static Content Summary</div>
          <div>Updated</div>
          <div>Location</div>
          <div></div>
        </div>

        {templates.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No templates found.</div>
        ) : (
          templates.map((template) => {
            const content = buildTemplateContent(template as any);
            const summary = [
              content.sections.confidentiality.title,
              content.sections.introduction.title,
              content.sections.scope.title,
              content.sections.risk_classification.title,
              content.sections.appendix_a.title,
            ].join(' • ');

            return (
              <div
                key={template.id}
                className="grid grid-cols-[minmax(260px,2fr)_minmax(240px,1.8fr)_160px_160px_56px] items-center border-b border-[#262626] px-4 py-4 text-sm hover:bg-[#202020]"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-green-400" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{template.name}</div>
                      <div className="truncate text-gray-400">{template.description || 'No description provided'}</div>
                    </div>
                    {template.is_default ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        <Star className="h-3 w-3" />
                        Default
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="truncate pr-4 text-gray-300">{summary}</div>
                <div className="text-gray-300">{new Date(template.updated_at).toLocaleDateString()}</div>
                <div className="text-gray-300">Template Library</div>

                <div className="relative flex justify-end overflow-visible" ref={menuTemplateId === template.id ? menuRef : null}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuTemplateId((current) => (current === template.id ? null : template.id));
                    }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuTemplateId === template.id ? (
                    <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#2a2a2a] bg-[#181818] p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => navigate(`/templates/${template.id}?mode=view`)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#242424]"
                      >
                        <Eye className="h-4 w-4" />
                        View Template
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/templates/${template.id}?mode=edit`)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#242424]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Data
                      </button>
                      {!template.is_default ? (
                        <button
                          type="button"
                          onClick={() => void handleSetDefault(template)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#242424]"
                        >
                          <Star className="h-4 w-4" />
                          Set Default
                        </button>
                      ) : null}
                      {!template.is_default ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(template)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReportTemplatesPage;
