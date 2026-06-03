import { Moon, Sun } from "lucide-react";

type Phase = 'idle' | 'loading' | 'results' | 'error';
type Theme = 'light' | 'dark';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Idle',
  loading: 'Processing',
  results: 'Results',
  error: 'Error',
};

const PHASE_COLORS: Record<Phase, { bg: string; text: string }> = {
  idle:    { bg: 'var(--neutral-bg)', text: 'var(--neutral-text)' },
  loading: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  results: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  error:   { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
};

interface AppHeaderProps {
  phase: Phase;
  theme: Theme;
  onToggleTheme: () => void;
}

export function AppHeader({ phase, theme, onToggleTheme }: AppHeaderProps) {
  const colors = PHASE_COLORS[phase];
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-4"
      style={{ height: '56px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-baseline">
        <span style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: '20px', color: 'var(--primary)' }}>
          TSI
        </span>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '20px', color: 'var(--text-primary)' }}>
          Cleanup
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="flex items-center justify-center"
          style={{
            width: '32px',
            height: '32px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-control)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 500,
            fontSize: '12px',
            color: colors.text,
            backgroundColor: colors.bg,
            borderRadius: '9999px',
            padding: '2px 10px',
            transition: 'color 150ms ease-out, background-color 150ms ease-out',
          }}
        >
          {PHASE_LABEL[phase]}
        </span>
      </div>
    </header>
  );
}
