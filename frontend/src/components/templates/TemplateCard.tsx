import { FileText, Eye, Edit2, Trash2, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
}

interface TemplateCardProps {
  template: ReportTemplate;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TemplateCard = ({ template, onView, onEdit, onDelete }: TemplateCardProps) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow bg-white border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
        </div>
        {template.is_default && (
          <Badge variant="default" className="bg-green-600 text-white">
            <Star className="w-3 h-3 mr-1" />
            Default
          </Badge>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      <p className="text-xs text-gray-500 mb-4">
        Created: {new Date(template.created_at).toLocaleDateString()}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        {!template.is_default && (
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </Card>
  );
};

export default TemplateCard;
