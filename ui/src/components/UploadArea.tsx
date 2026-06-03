import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface UploadAreaProps {
  onFile: (file: File) => void;
}

export function UploadArea({ onFile }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="w-full max-w-md rounded-xl px-12 py-20 text-center cursor-pointer select-none flex flex-col items-center gap-5"
        style={{
          border: dragging
            ? '2px dashed var(--primary)'
            : '2px dashed var(--border-control)',
          backgroundColor: dragging ? 'var(--surface-hover)' : 'transparent',
          transition: 'border-color 150ms ease-out, background-color 150ms ease-out',
        }}
      >
        <ArrowUp
          size={32}
          style={{ color: 'var(--primary)' }}
          strokeWidth={2}
        />
        <div className="flex flex-col gap-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 400, color: 'var(--text-secondary)' }}>
            Drop a CSV to begin
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary-muted)' }}>
            or click to browse
          </p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            borderRadius: '6px',
            height: '36px',
            width: '120px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 150ms ease-out',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary)'; }}
        >
          Browse files
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
