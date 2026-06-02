import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { exportBatchResultsToCsv } from "../src/csv/exporter.js";
import { importCsvString } from "../src/csv/importer.js";
import type { CsvRowError } from "../src/csv/importer.js";
import { processBatch } from "../src/domain/batch-processor.js";
import type {
	BatchProcessResult,
	BatchProgress,
} from "../src/domain/batch-processor.js";
import {
	applyAiReviewResult,
	reviewFailedMenuWithAi,
	selectRowsForAiReview,
} from "../src/domain/ai-review.js";
import { checkUrl } from "../src/domain/url-checker.js";

const nodeProcess = (
	globalThis as {
		process?: {
			env: Record<string, string | undefined>;
			loadEnvFile?: (path?: string) => void;
		};
	}
).process;

try {
	nodeProcess?.loadEnvFile?.(".env");
} catch {
	// .env is optional. The AI endpoint reports a missing key when invoked.
}

const app = new Hono();
const jobs = new Map<string, ProcessJob>();
const MAX_COMPLETED_JOBS = 10;

type AiReviewProgress = {
	status: "processing" | "complete" | "error";
	completed: number;
	total: number;
	updated: number;
	errors: number;
	error?: string;
};

type ProcessJob = {
	id: string;
	fileName: string;
	status: "processing" | "complete" | "error";
	progress: BatchProgress;
	result?: BatchProcessResult;
	csv?: string;
	importErrors: CsvRowError[];
	error?: string;
	aiReview?: AiReviewProgress;
};

app.use("*", cors({ origin: "http://localhost:5173" }));

app.post("/api/process", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body["file"];

		if (!file || !(file instanceof File)) {
			return c.json({ error: "missing_file" }, 400);
		}

		const csvText = await file.text();
		const importResult = importCsvString(csvText);

		if (importResult.missingRequiredColumns.length > 0) {
			return c.json(
				{ error: "missing_columns", columns: importResult.missingRequiredColumns },
				400,
			);
		}

		if (importResult.errors.length > 0 && importResult.records.length === 0) {
			return c.json(
				{ error: "parse_error", details: importResult.errors },
				400,
			);
		}

		pruneCompletedJobs();
		const job: ProcessJob = {
			id: crypto.randomUUID(),
			fileName: file.name,
			status: "processing",
			progress: {
				completed: 0,
				total: importResult.records.length,
				processed: 0,
				errors: 0,
			},
			importErrors: importResult.errors,
		};
		jobs.set(job.id, job);
		void processJob(job, importResult.records);

		return c.json({ jobId: job.id }, 202);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: "internal_error", message }, 500);
	}
});

app.get("/api/process/:jobId", (c) => {
	const job = jobs.get(c.req.param("jobId"));
	if (!job) return c.json({ error: "job_not_found" }, 404);

	if (job.status === "error") {
		return c.json({ status: job.status, error: job.error ?? "internal_error" });
	}
	if (job.status === "complete" && job.result && job.csv !== undefined) {
		return c.json({
			status: job.status,
			data: {
				result: job.result,
				csv: job.csv,
				importErrors: job.importErrors,
				...(job.aiReview ? { aiReview: job.aiReview } : {}),
			},
		});
	}

	return c.json({ status: job.status, progress: job.progress });
});

app.post("/api/process/:jobId/ai-review", async (c) => {
	const job = jobs.get(c.req.param("jobId"));
	if (!job) return c.json({ error: "job_not_found" }, 404);
	if (job.status !== "complete" || !job.result) {
		return c.json({ error: "job_not_complete" }, 409);
	}
	if (job.aiReview?.status === "processing") {
		return c.json({ error: "ai_review_in_progress" }, 409);
	}

	const apiKey = nodeProcess?.env["OPENAI_API_KEY"]?.trim();
	if (!apiKey) return c.json({ error: "missing_openai_api_key" }, 400);

	const body: { limit?: unknown; rowIndexes?: unknown } = await c.req.json().catch(() => ({}));
	const rows = selectRowsForAiReview(job.result, body);

	job.aiReview = {
		status: rows.length === 0 ? "complete" : "processing",
		completed: 0,
		total: rows.length,
		updated: 0,
		errors: 0,
	};
	if (rows.length > 0) void processAiReview(job, rows, apiKey);

	return c.json({ status: job.aiReview.status, progress: job.aiReview }, 202);
});

async function processJob(
	job: ProcessJob,
	records: Parameters<typeof processBatch>[0],
): Promise<void> {
	try {
		job.result = await processBatch(records, checkUrl, {
			onProgress: (progress) => {
				job.progress = progress;
			},
		});
		job.csv = exportBatchResultsToCsv(job.result.results);
		job.status = "complete";
	} catch (err) {
		job.status = "error";
		job.error = err instanceof Error ? err.message : String(err);
	}
}

function pruneCompletedJobs(): void {
	const completedJobs = [...jobs.values()].filter(
		(job) => job.status !== "processing",
	);
	for (const job of completedJobs.slice(0, -MAX_COMPLETED_JOBS)) {
		jobs.delete(job.id);
	}
}

async function processAiReview(
	job: ProcessJob,
	rows: ReturnType<typeof selectRowsForAiReview>,
	apiKey: string,
): Promise<void> {
	const progress = job.aiReview;
	if (!progress) return;

	for (const { result } of rows) {
		try {
			const review = await reviewFailedMenuWithAi(result.row, {
				apiKey,
				...(nodeProcess?.env["OPENAI_AI_REVIEW_MODEL"]?.trim()
					? { model: nodeProcess.env["OPENAI_AI_REVIEW_MODEL"].trim() }
					: {}),
			});
			applyAiReviewResult(result.row, review);
			progress.updated++;
		} catch (err) {
			result.row.aiReviewStatus = "error";
			result.row.aiError = err instanceof Error ? err.message : String(err);
			progress.errors++;
		}
		progress.completed++;
		job.csv = exportBatchResultsToCsv(job.result!.results);
	}

	progress.status = progress.errors === progress.total ? "error" : "complete";
	if (progress.status === "error") {
		progress.error = "All AI reviews failed. Check API key, billing, and server logs.";
	}
}

serve({ fetch: app.fetch, port: 3000 }, (info) => {
	console.log(`Server running at http://localhost:${info.port}`);
});
