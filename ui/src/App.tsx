import { useState } from "react";
import type { ApiErrorResponse, ApiResponse, BatchProcessResult, CsvRowError } from "./types";
import { AppHeader } from "./components/AppHeader";
import { UploadArea } from "./components/UploadArea";
import { ProcessingView } from "./components/ProcessingView";
import { ErrorView } from "./components/ErrorView";
import { ResultsView } from "./components/ResultsView";

type AppPhase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "results"; result: BatchProcessResult; csv: string; importErrors: CsvRowError[] }
  | { phase: "error"; message: string };

export default function App() {
  const [state, setState] = useState<AppPhase>({ phase: "idle" });

  async function handleFile(file: File) {
    setState({ phase: "loading" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/process", { method: "POST", body });
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        setState({
          phase: "results",
          result: data.result,
          csv: data.csv,
          importErrors: data.importErrors,
        });
      } else {
        const data = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as ApiErrorResponse;
        setState({ phase: "error", message: data.error ?? `HTTP ${res.status}` });
      }
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  function handleReset() {
    setState({ phase: "idle" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">
        {state.phase === "idle" && <UploadArea onFile={handleFile} />}
        {state.phase === "loading" && <ProcessingView />}
        {state.phase === "error" && (
          <ErrorView message={state.message} onReset={handleReset} />
        )}
        {state.phase === "results" && (
          <ResultsView
            result={state.result}
            csv={state.csv}
            importErrors={state.importErrors}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
