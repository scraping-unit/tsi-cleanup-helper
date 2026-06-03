import type { ProcessProgress } from "../types";

interface ProcessingViewProps {
  fileName?: string;
  progress?: ProcessProgress;
}

export function ProcessingView({ fileName, progress }: ProcessingViewProps) {
  const percentage = progress?.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div
        className="animate-spin"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          border: '4px solid var(--border-control)',
          borderTopColor: 'var(--primary)',
          animationDuration: '1.2s',
          animationTimingFunction: 'linear',
        }}
      />
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500, fontSize: '16px', color: 'var(--text-primary)' }}>
        Checking URLs
      </p>
      {fileName && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {fileName}
        </p>
      )}
      {progress && (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.completed}
            className="h-2 overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--border-control)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${percentage}%`,
                backgroundColor: 'var(--primary)',
                transition: 'width 150ms ease-out',
              }}
            />
          </div>
          <p className="text-center" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {progress.completed} / {progress.total} menus checked
          </p>
        </div>
      )}
    </div>
  );
}
