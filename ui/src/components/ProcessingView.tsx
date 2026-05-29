import { Loader2 } from "lucide-react";

export function ProcessingView() {
  return (
    <div className="min-h-[calc(100vh-49px)] flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        Uploading and checking URLs — this may take a minute for large files.
      </p>
    </div>
  );
}
