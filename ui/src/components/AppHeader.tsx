type Phase = 'idle' | 'loading' | 'results' | 'error';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Idle',
  loading: 'Processing',
  results: 'Results',
  error: 'Error',
};

const PHASE_COLORS: Record<Phase, { bg: string; text: string }> = {
  idle:    { bg: '#F4F0ED', text: '#6B4230' },
  loading: { bg: '#FFF0CC', text: '#A05C00' },
  results: { bg: '#E8F7EF', text: '#2D7A4F' },
  error:   { bg: '#FDECEA', text: '#B83030' },
};

interface AppHeaderProps {
  phase: Phase;
}

export function AppHeader({ phase }: AppHeaderProps) {
  const colors = PHASE_COLORS[phase];
  return (
    <header
      className="sticky top-0 z-10 bg-white flex items-center justify-between px-4"
      style={{ height: '56px', borderBottom: '1px solid rgb(238 97 44 / 0.15)' }}
    >
      <div className="flex items-baseline">
        <span style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: '20px', color: '#EE612C' }}>
          TSI
        </span>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '20px', color: '#1A120B' }}>
          Cleanup
        </span>
      </div>
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
    </header>
  );
}
