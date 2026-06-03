interface ErrorViewProps {
  message: string;
  onReset: () => void;
}

export function ErrorView({ message, onReset }: ErrorViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
      <div
        style={{
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '14px',
          padding: '12px 16px',
          borderRadius: '6px',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        {message}
      </div>
      <button
        type="button"
        onClick={onReset}
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: 'var(--primary-foreground)',
          backgroundColor: 'var(--primary)',
          border: 'none',
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          cursor: 'pointer',
          transition: 'background-color 150ms ease-out',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary)'; }}
      >
        Try again
      </button>
    </div>
  );
}
