'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const brandButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-gradient text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
        outline: 'border-2 border-transparent bg-brand-gradient-to-r bg-clip-padding border-brand-gradient hover:opacity-90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BrandButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof brandButtonVariants> {
  asChild?: boolean;
}

const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(brandButtonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
BrandButton.displayName = 'BrandButton';

export { BrandButton, brandButtonVariants };
