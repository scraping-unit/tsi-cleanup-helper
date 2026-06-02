import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AiReviewProgress, ApiErrorResponse, BatchProcessResult, CsvRowError, ProcessJobCreatedResponse, ProcessJobSnapshot, ProcessProgress } from "./types";
import { AppHeader } from "./components/AppHeader";
import { UploadArea } from "./components/UploadArea";
import { ProcessingView } from "./components/ProcessingView";
import { ErrorView } from "./components/ErrorView";
import { ResultsView } from "./components/ResultsView";

type AppPhase =
  | { phase: "idle" }
  | { phase: "loading"; fileName: string; progress?: ProcessProgress }
  | { phase: "results"; result: BatchProcessResult; csv: string; importErrors: CsvRowError[]; aiReview?: AiReviewProgress }
  | { phase: "error"; message: string };

type SavedJob = { jobId: string; fileName: string };

const ACTIVE_JOB_STORAGE_KEY = "tsi-cleanup-active-job";
const POLL_INTERVAL_MS = 500;

export default function App() {
  const [state, setState] = useState<AppPhase>({ phase: "idle" });
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedJob = loadSavedJob();
    if (!savedJob) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    void followJob(savedJob, controller.signal, setState);

    return () => controller.abort();
  }, []);

  async function handleFile(file: File) {
    activeRequest.current?.abort();
    setState({ phase: "loading", fileName: file.name });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/process", { method: "POST", body });
      if (res.ok) {
        const { jobId } = (await res.json()) as ProcessJobCreatedResponse;
        const savedJob = { jobId, fileName: file.name };
        saveJob(savedJob);
        const controller = new AbortController();
        activeRequest.current = controller;
        await followJob(savedJob, controller.signal, setState);
      } else {
        const data = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as ApiErrorResponse;
        setState({ phase: "error", message: data.error ?? `HTTP ${res.status}` });
      }
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  function handleReset() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    setState({ phase: "idle" });
  }

  async function handleAiReview(limit: number) {
    await runAiReview({ limit });
  }

  async function handleAiReviewSelected(rowIndexes: number[]) {
    await runAiReview({ rowIndexes });
  }

  async function runAiReview(payload: { limit: number } | { rowIndexes: number[] }) {
    const savedJob = loadSavedJob();
    if (!savedJob || state.phase !== "results") return;

    try {
      const response = await fetch(`/api/process/${encodeURIComponent(savedJob.jobId)}/ai-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({ error: `HTTP ${response.status}` }))) as
        | { status: AiReviewProgress["status"]; progress: AiReviewProgress }
        | ApiErrorResponse;
      if (!response.ok || !("progress" in data)) {
        throw new Error("error" in data ? data.error : `HTTP ${response.status}`);
      }

      setState({ ...state, aiReview: data.progress });
      const controller = new AbortController();
      activeRequest.current = controller;
      await followJob(savedJob, controller.signal, setState);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ ...state, aiReview: { status: "error", completed: 0, total: 0, updated: 0, errors: 1, error: message } });
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader phase={state.phase} />
      <main className="flex-1 flex flex-col">
        {state.phase === "idle" && <UploadArea onFile={handleFile} />}
        {state.phase === "loading" && <ProcessingView fileName={state.fileName} progress={state.progress} />}
        {state.phase === "error" && (
          <ErrorView message={state.message} onReset={handleReset} />
        )}
        {state.phase === "results" && (
          <ResultsView
            result={state.result}
            csv={state.csv}
            importErrors={state.importErrors}
            aiReview={state.aiReview}
            onAiReview={handleAiReview}
            onAiReviewSelected={handleAiReviewSelected}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

async function followJob(
  job: SavedJob,
  signal: AbortSignal,
  setState: Dispatch<SetStateAction<AppPhase>>,
): Promise<void> {
  try {
    while (!signal.aborted) {
      const response = await fetch(`/api/process/${encodeURIComponent(job.jobId)}`, { signal });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: `HTTP ${response.status}` }))) as ApiErrorResponse;
        throw new Error(data.error === "job_not_found" ? "Saved review session expired. Upload the CSV again." : data.error);
      }

      const snapshot = (await response.json()) as ProcessJobSnapshot;
      if (snapshot.status === "processing") {
        setState({ phase: "loading", fileName: job.fileName, progress: snapshot.progress });
        await wait(POLL_INTERVAL_MS, signal);
        continue;
      }
      if (snapshot.status === "error") throw new Error(snapshot.error);

      setState({
        phase: "results",
        result: snapshot.data.result,
        csv: snapshot.data.csv,
        importErrors: snapshot.data.importErrors,
        ...(snapshot.data.aiReview ? { aiReview: snapshot.data.aiReview } : {}),
      });
      if (snapshot.data.aiReview?.status === "processing") {
        await wait(POLL_INTERVAL_MS, signal);
        continue;
      }
      return;
    }
  } catch (err) {
    if (signal.aborted) return;
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

function saveJob(job: SavedJob): void {
  localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(job));
}

function loadSavedJob(): SavedJob | undefined {
  const value = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as SavedJob;
  } catch {
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    return undefined;
  }
}

async function wait(timeoutMs: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
