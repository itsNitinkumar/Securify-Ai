import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Clock, Trash2, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { searchApi, SearchHistoryItem } from '@/api/searchApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SearchResults from '@/components/search/SearchResults';
import QuickStats from '@/components/search/QuickStats';

const exampleQueries = [
  'Show all critical findings',
  'Show SQL Injection findings',
  'Show completed projects',
  'Show projects assigned to Krishna',
  'Show findings for Swiftdigital',
  'Show projects pending review',
  'How many critical findings exist?',
  'Which reporter has the highest workload?',
  'Show false positive findings',
  'Show DAST projects',
];

const SearchIntelPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [entity, setEntity] = useState('findings');
  const [action, setAction] = useState('list');
  const [analytics, setAnalytics] = useState<any>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
    loadSuggestions();
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadHistory = async () => {
    try {
      const res = await searchApi.getHistory(5);
      setHistory((res.data as any)?.data || []);
    } catch { /* silent */ }
  };

  const loadSuggestions = async () => {
    try {
      const res = await searchApi.getSuggestions();
      const data = (res.data as any)?.data || res.data;
      if (data) {
        const all: string[] = [
          ...(data.projects || []).map((n: string) => `project:${n}`),
          ...(data.reporters || []).map((n: string) => `reporter:${n}`),
          ...(data.clients || []).map((n: string) => `client:${n}`),
          ...(data.templates || []).map((n: string) => `template:${n}`),
          ...(data.findings || []).map((n: string) => n),
        ];
        setSuggestions(all);
        setTemplates(data.templates || []);
      }
    } catch { /* silent */ }
  };

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setError('');
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    setShowHistory(false);

    try {
      const response = await searchApi.query(q);
      const data = response.data as any;
      setResults(data.results || []);
      setEntity(data.entity || 'findings');
      setAction(data.action || 'list');
      setAnalytics(data.analytics || null);
      setParsed(data.parsed || null);
      loadHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg) {
        setError(msg);
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Unable to connect to the server. Please check your connection.');
      } else if (err?.response?.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
      } else if (err?.response?.status === 503) {
        setError('AI search service is temporarily unavailable. Please try again later.');
      } else {
        setError('Search failed. Please try again.');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleHistoryClick = (item: SearchHistoryItem) => {
    setQuery(item.query);
    handleSearch(item.query);
  };

  const handleClearHistory = async () => {
    try {
      await searchApi.clearHistory();
      setHistory([]);
    } catch { /* silent */ }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      const filtered = suggestions.filter(s =>
        s.replace(/^(project|reporter|client|template):/i, '').toLowerCase().includes(value.toLowerCase())
      );
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const display = suggestion.includes(':') ? suggestion.split(':')[1] : suggestion;
    setQuery(display);
    setShowSuggestions(false);
    handleSearch(display);
  };

  const displaySuggestion = (s: string) => {
    if (!s.includes(':')) return s;
    const [type, name] = s.split(':');
    const labels: Record<string, string> = { project: 'Project', reporter: 'Reporter', client: 'Client', template: 'Template' };
    return (
      <span>
        <span className="text-primary text-[10px] mr-1.5 uppercase">{labels[type] || type}</span>
        {name}
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleResultNavigate = (id: number) => {
    if (entity === 'projects' || entity === 'workflow') {
      navigate(`/projects/${id}`);
    } else {
      navigate(`/findings/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Search Intel</h1>
        </div>
        <p className="text-sm md:text-base text-on-surface-variant">
          Natural language search powered by Sentinel AI
        </p>
      </div>

      <Card className="p-4 md:p-6 bg-surface-high border-primary/20 glow-primary mb-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="p-2 md:p-3 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (history.length > 0 && !query) setShowHistory(true);
                }}
                placeholder="Ask Sentinel: 'Show critical findings from last month...'"
                className="w-full pl-10 pr-24 py-3 md:py-4 bg-surface border border-outline rounded-lg text-on-surface text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
                disabled={loading}
              />
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary text-surface hover:bg-primary/90 h-8 md:h-10"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {showHistory && history.length > 0 && !query && (
              <div ref={suggestionRef}
                className="absolute z-50 mt-1 w-full bg-surface border border-outline rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recent Searches
                  </span>
                  <button onClick={handleClearHistory}
                    className="text-xs text-on-surface-variant hover:text-error flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                {history.map((item) => (
                  <button key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-high flex items-center gap-2">
                    <Clock className="w-3 h-3 text-on-surface-variant flex-shrink-0" />
                    <span className="truncate">{item.query}</span>
                    <span className="text-[10px] text-on-surface-variant ml-auto flex-shrink-0">
                      {item.entity}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && query.length >= 2 && (
              <div ref={suggestionRef}
                className="absolute z-50 mt-1 w-full bg-surface border border-outline rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions
                  .filter(s => s.replace(/^(project|reporter|client|template):/i, '').toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 10)
                  .map((s, i) => (
                    <button key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-high">
                      {displaySuggestion(s)}
                    </button>
                  ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => { setQuery(example); handleSearch(example); }}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 bg-surface rounded-full border border-outline-variant hover:border-primary transition-colors text-on-surface-variant hover:text-primary disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {parsed && (
        <Card className="p-4 bg-surface-high border-outline mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface mb-2">
                Query: <span className="text-primary font-medium">"{query}"</span>
                <span className="text-xs text-on-surface-variant ml-2">
                  → {entity.replace(/_/g, ' ') || 'global'} ({action})
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parsed.filters || {}).map(([key, val]) =>
                  val ? (
                    <Badge key={key} className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {key.replace(/_/g, ' ').toUpperCase()}: {String(val)}
                    </Badge>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-error/10 border-error/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-error mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch()}
                className="text-xs border-error/30 text-error hover:bg-error/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <QuickStats templates={templates} onSearch={(q) => { setQuery(q); handleSearch(q); }} />
        </div>
        <div className="lg:col-span-3">
          <SearchResults
            results={results}
            entity={entity}
            analytics={analytics}
            loading={loading}
            query={searched ? query : ''}
            parsed={parsed}
            onNavigate={handleResultNavigate}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchIntelPage;
