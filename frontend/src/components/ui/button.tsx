import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-[#00fc40] text-[#005a10] hover:bg-[#9cff93] shadow-[0_0_40px_rgba(0,252,64,0.15)]',
      secondary: 'bg-transparent border border-[#494847] text-[#ffffff] hover:bg-[#2c2c2c]',
      ghost: 'bg-transparent text-[#9cff93] hover:bg-[#13131320]',
    };

    const sizes = {
      default: 'h-12 px-6 py-3',
      sm: 'h-9 px-4',
      lg: 'h-14 px-8',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
