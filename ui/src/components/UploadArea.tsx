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
            ? '2px dashed rgb(238 97 44 / 0.6)'
            : '2px dashed rgb(238 97 44 / 0.2)',
          backgroundColor: dragging ? 'rgb(255 244 223 / 0.8)' : 'transparent',
          transition: 'border-color 150ms ease-out, background-color 150ms ease-out',
        }}
      >
        <ArrowUp
          size={32}
          style={{ color: '#EE612C' }}
          strokeWidth={2}
        />
        <div className="flex flex-col gap-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 400, color: '#6B4230' }}>
            Drop a CSV to begin
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 400, color: 'rgb(107 66 48 / 0.6)' }}>
            or click to browse
          </p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          style={{
            backgroundColor: '#EE612C',
            color: '#FFFFFF',
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
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D4521E'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EE612C'; }}
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
