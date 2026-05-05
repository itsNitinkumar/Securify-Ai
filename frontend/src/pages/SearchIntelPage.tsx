import { useState } from 'react';
import { Search, Sparkles, Filter, TrendingUp, FileText, Activity, Send } from 'lucide-react';
import { findingApi } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SearchResults from '@/components/search/SearchResults';
import SmartFilters from '@/components/search/SmartFilters';
import QuickStats from '@/components/search/QuickStats';
import SentinelChat from '@/components/search/SentinelChat';

const SearchIntelPage = () => {
  const [query, setQuery] = useState('');
  const [parsedQuery, setParsedQuery] = useState<any>(null);
  const [results, setResults] = useState<any>({
    findings: [],
    reports: [],
    activities: [],
  });
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    timeframe: 'all',
    status: 'all',
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response = await findingApi.queryFindings(query);
      setResults({
        findings: response.data || [],
        reports: [],
        activities: [],
      });
      setParsedQuery((response as any).filters || {});
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const exampleQueries = [
    'critical findings from the last month',
    'SQL injection vulnerabilities',
    'findings in production environment',
    'high severity issues pending review',
  ];

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
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

      {/* Search Bar */}
      <Card className="p-4 md:p-6 bg-surface-high border-primary/20 glow-primary mb-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="p-2 md:p-3 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Sentinel: 'Show me critical findings from last month...'"
                className="w-full pl-10 pr-24 py-3 md:py-4 bg-surface border border-outline rounded-lg text-on-surface text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary text-surface hover:bg-primary/90 h-8 md:h-10"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Example Queries */}
            <div className="mt-3 flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="text-xs px-3 py-1.5 bg-surface rounded-full border border-outline-variant hover:border-primary transition-colors text-on-surface-variant hover:text-primary"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Parsed Query Display */}
      {parsedQuery && (
        <Card className="p-4 bg-surface-high border-outline mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface mb-2">
                Parsed query: <span className="text-primary font-medium">"{query}"</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedQuery.severity && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    SEVERITY: {parsedQuery.severity}
                  </Badge>
                )}
                {parsedQuery.timeframe && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    TIMEFRAME: {parsedQuery.timeframe}
                  </Badge>
                )}
                {parsedQuery.status && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    STATUS: {parsedQuery.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Smart Filters */}
          <SmartFilters filters={filters} onFiltersChange={setFilters} />

          {/* Quick Stats */}
          <QuickStats />

          {/* Sentinel AI Chat Toggle */}
          <Card className="p-4 bg-surface-high border-primary/20">
            <Button
              onClick={() => setShowChat(!showChat)}
              className="w-full bg-primary text-surface hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showChat ? 'Hide' : 'Show'} AI Chat
            </Button>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {showChat ? (
            <SentinelChat />
          ) : (
            <SearchResults results={results} loading={loading} query={query} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchIntelPage;
