import type {
	DeliverooPageState,
	FailedMenuEvidence,
	NormalizedFailedMenuRecord,
	ProcessedOutputRow,
	UrlCheckEvidence,
} from "./types.js";
import { recommendCleanupStatus } from "./recommendation-engine.js";
import { checkDeliverooWithFallback } from "./deliveroo-fallback.js";
import { checkJustEatWithFallback } from "./justeat-fallback.js";
import { detectMenuPlatformFromUrl } from "./platform-detection.js";

export type UrlCheckerFn = (url: string) => Promise<UrlCheckEvidence>;

export async function processFailedMenuRecord(
	record: NormalizedFailedMenuRecord,
	urlChecker: UrlCheckerFn,
): Promise<ProcessedOutputRow> {
	const urlEvidence = await urlChecker(record.menuUrl);

	const platform =
		urlEvidence.detectedPlatform ?? detectMenuPlatformFromUrl(record.menuUrl);
	const gatePlatform = platform.toLowerCase();
	const willFire =
		urlEvidence.result === "not_verifiable" &&
		(gatePlatform === "deliveroo" || gatePlatform === "justeat");

	console.log(
		`[row-processor] id=${record.menuId} url_result=${urlEvidence.result} ` +
			`platform=${gatePlatform} fallback_will_fire=${willFire}`,
	);

	let deliverooVerified: DeliverooPageState | undefined;
	if (willFire) {
		if (gatePlatform === "deliveroo") {
			const fallback = await checkDeliverooWithFallback(
				record.menuUrl,
				undefined,
				record.menuId,
			);
			deliverooVerified =
				fallback.pageState !== "unknown" ? fallback.pageState : undefined;
		}
		if (gatePlatform === "justeat") {
			await checkJustEatWithFallback(record.menuUrl, undefined, record.menuId);
		}
	}

	const evidence: FailedMenuEvidence = {
		checkState: "checked",
		currentUrl: urlEvidence,
		scrapeStillFailed: true,
		...(deliverooVerified ? { deliverooVerified } : {}),
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
		...(deliverooVerified !== undefined ? { deliverooVerified } : {}),
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
