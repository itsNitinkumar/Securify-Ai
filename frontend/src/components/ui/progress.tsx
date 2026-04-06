import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[#131313]', className)}
        {...props}
      >
        <div
          className="h-full bg-gradient-to-r from-[#9cff93] to-[#00fc40] transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };