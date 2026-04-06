import * as React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-transparent bg-[#00fc40] text-[#005a10]': variant === 'default',
          'border-[#494847] text-[#adaaaa]': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };