import { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Sparkles } from 'lucide-react';
import { findingLibraryApi, FindingTemplate } from '@/api/findingLibraryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import TemplateCard from '@/components/finding-library/TemplateCard';
import TemplateDetailDialog from '@/components/finding-library/TemplateDetailDialog';
import CreateTemplateDialog from '@/components/finding-library/CreateTemplateDialog';

const FindingLibraryPage = () => {
  const [templates, setTemplates] = useState<FindingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<FindingTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FindingTemplate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesRes, categoriesRes] = await Promise.all([
        findingLibraryApi.getAllTemplates(),
        findingLibraryApi.getCategories(),
      ]);
      setTemplates(templatesRes.data.templates);
      setCategories(['All Categories', ...categoriesRes.data.categories]);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateClick = (template: FindingTemplate) => {
    setSelectedTemplate(template);
    setIsDetailOpen(true);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const response = await findingLibraryApi.searchTemplates(query);
        setFilteredTemplates(response.data.templates);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-on-surface">Finding Library</h1>
        </div>
        <p className="text-on-surface-variant">
          Access the sentinel-grade repository of pre-validated vulnerability templates.
          Curated for rapid report generation and precision testing.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <Input
            type="text"
            placeholder="Search vulnerabilities..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-surface-high border-outline text-on-surface"
          />
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-surface hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Category Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            className={`cursor-pointer ${
              selectedCategory === category
                ? 'bg-primary text-surface'
                : 'border-outline text-on-surface-variant hover:border-primary'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* AI Assistant Hint */}
      <Card className="mb-6 p-4 bg-surface-high border-outline-variant">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-on-surface mb-1">Sentinel AI Ready</h3>
            <p className="text-sm text-on-surface-variant">
              I've detected you're looking at{' '}
              <span className="text-primary">{selectedCategory}</span> templates. Would you like
              me to pull the latest payload variants for this vulnerability?
            </p>
          </div>
        </div>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-on-surface-variant">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <p className="text-on-surface-variant">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedTemplate && (
        <TemplateDetailDialog
          template={selectedTemplate}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onUpdate={loadData}
        />
      )}

      <CreateTemplateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadData}
      />
    </div>
  );
};

export default FindingLibraryPage;
