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
): Promise<BatchProcessResult> {
	const results: BatchRowResult[] = [];
	const byStatus = emptyByStatus();
	const byConfidence = emptyByConfidence();
	let processed = 0;
	let errors = 0;

	for (let i = 0; i < records.length; i++) {
		const record = records[i]!;
		try {
			const row = await processFailedMenuRecord(record, urlChecker);
			results.push({ ok: true, row });
			byStatus[row.recommendedStatus]++;
			byConfidence[row.confidence]++;
			processed++;
		} catch (err) {
			results.push({
				ok: false,
				index: i,
				record,
				error: err instanceof Error ? err.message : String(err),
			});
			errors++;
		}
	}

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
