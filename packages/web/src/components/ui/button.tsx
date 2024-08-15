import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5',
  {
    variants: {
      variant: {
        default:
          'bg-primary border border-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:border-muted-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        run: 'bg-run text-run-foreground border border-run hover:bg-sb-yellow-30',
        ai: 'bg-ai-btn text-sb-core-0 border-ai-btn hover:bg-ai-btn/90',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:text-secondary-hover',
        link: 'text-primary underline-offset-4 hover:underline',
        ghost: 'border border-transparent hover:border hover:border-secondary-foreground',
        icon: 'bg-transparent text-secondary-foreground hover:bg-muted',
      },
      size: {
        default: 'h-8 px-3 py-2',
        'default-with-icon': 'h-8 pl-[0.625rem] pr-3 py-2 gap-1.5',
        sm: 'h-6 rounded-sm px-3 text-xs',
        lg: 'rounded-md px-3 py-2',
        icon: 'h-8 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
