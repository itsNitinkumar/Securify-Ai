import { useState, useEffect } from 'react';
import { findingApi } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Eye } from 'lucide-react';

interface VersionHistoryProps {
  findingId: number;
}

const VersionHistory = ({ findingId }: VersionHistoryProps) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [findingId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await findingApi.getVersionHistory(findingId);
      setVersions(response.data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Version History</h3>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-4">
          No version history available
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className="p-3 bg-surface rounded-lg border border-outline-variant"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={index === 0 ? 'default' : 'outline'}
                      className={`text-xs ${
                        index === 0
                          ? 'bg-primary text-surface'
                          : 'border-outline text-on-surface-variant'
                      }`}
                    >
                      v{version.version_number}
                    </Badge>
                    {index === 0 && (
                      <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                        CURRENT
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {formatDate(version.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              {version.changes && (
                <p className="text-xs text-on-surface-variant line-clamp-2">
                  {version.changes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VersionHistory;
