import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          {
            'bg-blue-100 text-blue-700': variant === 'default',
            'bg-green-100 text-green-700': variant === 'success',
            'bg-yellow-100 text-yellow-700': variant === 'warning',
            'bg-red-100 text-red-700': variant === 'error',
            'border border-gray-300 text-gray-700': variant === 'outline',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
