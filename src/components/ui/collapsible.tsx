'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ className, open, onOpenChange, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open || false);

    React.useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);

    const handleToggle = React.useCallback(() => {
      const newOpen = !isOpen;
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    }, [isOpen, onOpenChange]);

    return (
      <div
        ref={ref}
        className={cn('space-y-2', className)}
        data-state={isOpen ? 'open' : 'closed'}
        {...props}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            if (child.type === CollapsibleTrigger) {
              return React.cloneElement(child, { onClick: handleToggle });
            }
            if (child.type === CollapsibleContent) {
              return React.cloneElement(child, {
                isOpen,
                'data-state': isOpen ? 'open' : 'closed',
              });
            }
          }
          return child;
        })}
      </div>
    );
  }
);

Collapsible.displayName = 'Collapsible';

interface CollapsibleTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
}

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(({ className, children, isOpen, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden transition-all duration-200 ease-in-out',
        isOpen ? 'animate-collapsible-down' : 'animate-collapsible-up',
        className
      )}
      style={{
        display: isOpen ? 'block' : 'none',
      }}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
});

CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
