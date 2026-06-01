interface ProcessingViewProps {
  fileName?: string;
}

export function ProcessingView({ fileName }: ProcessingViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div
        className="animate-spin"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          border: '4px solid rgb(238 97 44 / 0.2)',
          borderTopColor: '#EE612C',
          animationDuration: '1.2s',
          animationTimingFunction: 'linear',
        }}
      />
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500, fontSize: '16px', color: '#1A120B' }}>
        Checking URLs
      </p>
      {fileName && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#6B4230' }}>
          {fileName}
        </p>
      )}
    </div>
  );
}
