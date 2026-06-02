import { CLEANUP_STATUSES } from "./statuses.js";
import type { CleanupStatus } from "./statuses.js";
import { CONFIDENCE_VALUES } from "./types.js";
import type {
	Confidence,
	NormalizedFailedMenuRecord,
	ProcessedOutputRow,
} from "./types.js";
import type { UrlCheckerFn } from "./row-processor.js";
import { processFailedMenuRecord } from "./row-processor.js";

export type BatchRowSuccess = {
	ok: true;
	row: ProcessedOutputRow;
};

export type BatchRowError = {
	ok: false;
	index: number;
	record: NormalizedFailedMenuRecord;
	error: string;
};

export type BatchRowResult = BatchRowSuccess | BatchRowError;

export type BatchSummary = {
	total: number;
	processed: number;
	errors: number;
	byStatus: Record<CleanupStatus, number>;
	byConfidence: Record<Confidence, number>;
};

export type BatchProcessResult = {
	results: BatchRowResult[];
	summary: BatchSummary;
};

export type BatchProgress = {
	completed: number;
	total: number;
	processed: number;
	errors: number;
	currentMenuId?: string;
};

export type BatchProcessorOptions = {
	concurrency?: number;
	onProgress?: (progress: BatchProgress) => void | Promise<void>;
};

const DEFAULT_CONCURRENCY = 4;

function emptyByStatus(): Record<CleanupStatus, number> {
	return Object.fromEntries(CLEANUP_STATUSES.map((s) => [s, 0])) as Record<
		CleanupStatus,
		number
	>;
}

function emptyByConfidence(): Record<Confidence, number> {
	return Object.fromEntries(CONFIDENCE_VALUES.map((c) => [c, 0])) as Record<
		Confidence,
		number
	>;
}

export async function processBatch(
	records: NormalizedFailedMenuRecord[],
	urlChecker: UrlCheckerFn,
	options: BatchProcessorOptions = {},
): Promise<BatchProcessResult> {
	const results = new Array<BatchRowResult>(records.length);
	const byStatus = emptyByStatus();
	const byConfidence = emptyByConfidence();
	const concurrency = normalizeConcurrency(options.concurrency);
	let nextIndex = 0;
	let completed = 0;
	let processed = 0;
	let errors = 0;

	async function processNextRecord(): Promise<void> {
		while (true) {
			const i = nextIndex++;
			if (i >= records.length) return;

			const record = records[i]!;
			try {
				const row = await processFailedMenuRecord(record, urlChecker);
				results[i] = { ok: true, row };
				byStatus[row.recommendedStatus]++;
				byConfidence[row.confidence]++;
				processed++;
			} catch (err) {
				results[i] = {
					ok: false,
					index: i,
					record,
					error: err instanceof Error ? err.message : String(err),
				};
				errors++;
			}

			completed++;
			await options.onProgress?.({
				completed,
				total: records.length,
				processed,
				errors,
				currentMenuId: record.menuId,
			});
		}
	}

	await Promise.all(
		Array.from(
			{ length: Math.min(concurrency, records.length) },
			() => processNextRecord(),
		),
	);

	return {
		results,
		summary: {
			total: records.length,
			processed,
			errors,
			byStatus,
			byConfidence,
		},
	};
}

function normalizeConcurrency(concurrency: number | undefined): number {
	if (concurrency === undefined || !Number.isFinite(concurrency)) {
		return DEFAULT_CONCURRENCY;
	}
	return Math.max(1, Math.floor(concurrency));
}
