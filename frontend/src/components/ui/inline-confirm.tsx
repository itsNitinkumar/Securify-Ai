import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type InlineConfirmProps = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  children?: React.ReactNode;
};

const InlineConfirm = ({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger,
  busy,
  onConfirm,
  onCancel,
  className,
  children,
}: InlineConfirmProps) => {
  return (
    <Card
      className={[
        'p-4 border',
        danger
          ? 'bg-error/5 border-error/30'
          : 'bg-surface-low border-outline-variant',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={danger ? 'text-sm font-semibold text-error' : 'text-sm font-semibold text-on-surface'}>
            {title}
          </div>
          {description ? <div className="mt-1 text-xs text-on-surface-variant">{description}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="border-outline text-on-surface-variant"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'bg-error text-surface hover:bg-error/90' : 'bg-primary text-surface hover:bg-primary/90'}
          >
            {busy ? 'Working…' : confirmText}
          </Button>
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
};

export default InlineConfirm;
