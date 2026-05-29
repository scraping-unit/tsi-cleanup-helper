import { useRef, useState } from "react";

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
    <div className="min-h-[calc(100vh-49px)] flex items-center justify-center px-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "w-full max-w-sm rounded-lg px-10 py-16 text-center cursor-pointer",
          "transition-colors select-none",
          dragging
            ? "border-2 border-solid border-foreground/40 bg-muted/50"
            : "border-2 border-dashed border-border hover:border-foreground/30 hover:bg-muted/30",
        ].join(" ")}
      >
        <p className="text-sm text-muted-foreground">
          Drag a CSV file here, or{" "}
          <span className="text-foreground font-medium">click to browse</span>
        </p>
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
