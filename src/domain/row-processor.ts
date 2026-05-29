import type {
	FailedMenuEvidence,
	NormalizedFailedMenuRecord,
	ProcessedOutputRow,
	UrlCheckEvidence,
} from "./types.js";
import { recommendCleanupStatus } from "./recommendation-engine.js";

export type UrlCheckerFn = (url: string) => Promise<UrlCheckEvidence>;

export async function processFailedMenuRecord(
	record: NormalizedFailedMenuRecord,
	urlChecker: UrlCheckerFn,
): Promise<ProcessedOutputRow> {
	const urlEvidence = await urlChecker(record.menuUrl);

	const evidence: FailedMenuEvidence = {
		checkState: "checked",
		currentUrl: urlEvidence,
		scrapeStillFailed: true,
	};

	const recommendation = recommendCleanupStatus(evidence);

	return {
		menuId: record.menuId,
		brandId: record.brandId,
		brandName: record.brandName,
		clusterId: record.clusterId,
		templateName: record.templateName,
		currentMenuUrl: record.menuUrl,
		scrapingStatus: record.scrapingStatus,
		currentUrlResult: urlEvidence.result,
		...(urlEvidence.httpStatus !== undefined ? { httpStatus: urlEvidence.httpStatus } : {}),
		...(urlEvidence.finalUrl !== undefined ? { finalUrl: urlEvidence.finalUrl } : {}),
		...(urlEvidence.detectedPlatform !== undefined ? { detectedPlatform: urlEvidence.detectedPlatform } : {}),
		...(urlEvidence.contentType !== undefined ? { contentType: urlEvidence.contentType } : {}),
		...(urlEvidence.contentSignal !== undefined ? { contentSignal: urlEvidence.contentSignal } : {}),
		// menuContentDetected: not detectable at this stage; false = not yet confirmed
		menuContentDetected: false,
		brandMatch: "unknown",
		recommendedStatus: recommendation.recommended_status,
		confidence: recommendation.confidence,
		recommendationReason: recommendation.recommendation_reason,
		needsEscalation: recommendation.needs_escalation,
		...(recommendation.escalation_reason !== undefined ? { escalationReason: recommendation.escalation_reason } : {}),
	};
}
