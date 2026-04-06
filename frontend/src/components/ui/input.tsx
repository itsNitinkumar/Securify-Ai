import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full bg-[#131313] text-[#ffffff] px-4 py-3.5 rounded-md border-b-2 border-[#49484726] transition-all duration-300 placeholder:text-[#494847] focus:outline-none focus:border-[#9cff93] focus:shadow-[0_0_40px_rgba(0,252,64,0.05)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
