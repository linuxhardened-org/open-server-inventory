import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthFormSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Elevated panel for login / change-password — matches app surface tokens and works on the CPU schematic background.
 */
export function AuthFormSurface({ children, className }: AuthFormSurfaceProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 text-foreground',
        'shadow-[0_24px_48px_-28px_rgba(0,0,0,0.22)]',
        'dark:border-border dark:shadow-[0_28px_56px_-20px_rgba(0,0,0,0.75)]',
        'ring-1 ring-black/[0.05] dark:ring-white/[0.08]',
        'backdrop-blur-sm dark:backdrop-blur-none',
        'sm:p-10',
        className
      )}
    >
      {children}
    </div>
  );
}

type AuthMobileBrandProps = {
  appName: string;
  className?: string;
};

/** Compact app mark + name for small screens (left column is hidden until lg). */
export function AuthMobileBrand({ appName, className }: AuthMobileBrandProps) {
  return (
    <div className={cn('mb-8 flex items-center justify-center gap-2.5 lg:hidden', className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">{appName}</span>
    </div>
  );
}
