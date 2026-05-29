import { Button } from "@/components/ui/button";

interface ErrorViewProps {
  message: string;
  onReset: () => void;
}

export function ErrorView({ message, onReset }: ErrorViewProps) {
  return (
    <div className="min-h-[calc(100vh-49px)] flex flex-col items-center justify-center gap-4 px-4">
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-lg w-full">
        {message}
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        Try again
      </Button>
    </div>
  );
}
