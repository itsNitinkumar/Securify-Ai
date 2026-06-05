import { type ReactNode } from 'react';
import { MessageSquarePlus, Pencil } from 'lucide-react';

export interface ReviewSectionProps {
  sectionKey: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  isActive?: boolean;
  onSelect: (sectionKey: string) => void;
  onEdit?: (sectionKey: string) => void;
  canEdit?: boolean;
  showAddComment?: boolean;
  className?: string;
  borderClass?: string;
}

const ReviewSection = ({
  sectionKey,
  label,
  icon,
  children,
  isActive = false,
  onSelect,
  onEdit,
  canEdit = false,
  showAddComment = true,
  className = '',
  borderClass = 'border-outline',
}: ReviewSectionProps) => {
  const ringClass = isActive ? 'ring-2 ring-primary' : '';

  const handleCommentClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onSelect(sectionKey);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(sectionKey);
  };

  return (
    <section
      data-section-key={sectionKey}
      className={`group rounded-md border ${borderClass} ${ringClass} bg-surface-high transition-colors ${className}`}
    >
      <button
        type="button"
        onClick={() => onSelect(sectionKey)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-t-md hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="flex-shrink-0 text-on-surface-variant">{icon}</span> : null}
          <span className="text-sm font-semibold text-on-surface truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && onEdit ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleEditClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(sectionKey);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary px-2 py-0.5 rounded cursor-pointer"
              title="Edit section"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </span>
          ) : null}
          {showAddComment ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleCommentClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCommentClick(e);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary px-2 py-0.5 rounded cursor-pointer"
              title="Add comment"
            >
              <span>Add comment</span>
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </span>
          ) : null}
        </div>
      </button>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  );
};

export default ReviewSection;
