import type { BatchRowResult } from "../domain/batch-processor.js";

const EXPORT_HEADERS = [
	// Group 1: Identity (headers match import schema exactly for round-trip compatibility)
	"menu_id",
	"brand_id",
	"brand_name",
	"cluster_id",
	"template_name",
	"menu_url",
	"scraping_status",
	// Group 2: Optional input passthrough
	"menu_link",
	"brand_gateway_task_link",
	"menu_definition_task_link",
	"scraper",
	"status",
	"comment",
	"menu_format",
	// Group 3: URL check evidence
	"current_url_result",
	"http_status",
	"final_url",
	"detected_platform",
	"content_type",
	"format_detected",
	"menu_content_detected",
	"brand_match",
	// Group 4: Candidate URL
	"candidate_new_url",
	"candidate_source",
	// Group 5: Recommendation
	"recommended_status",
	"confidence",
	"recommendation_reason",
	// Group 6: Human review
	"human_final_status",
	"human_comment",
	"needs_escalation",
	"escalation_reason",
	// Group 7: Processing error
	"processing_error",
] as const;

export function serializeCell(value: string): string {
	if (/[,"\r\n]/.test(value)) {
		return '"' + value.replaceAll('"', '""') + '"';
	}
	return value;
}

function serializeRow(cells: string[]): string {
	return cells.map(serializeCell).join(",");
}

export function exportBatchResultsToCsv(results: BatchRowResult[]): string {
	const rows: string[] = [serializeRow([...EXPORT_HEADERS])];

	for (const result of results) {
		if (result.ok) {
			const row = result.row;
			rows.push(
				serializeRow([
					// Group 1: Identity
					row.menuId,
					row.brandId,
					row.brandName,
					row.clusterId,
					row.templateName,
					row.currentMenuUrl,
					row.scrapingStatus,
					// Group 2: Optional input passthrough
					// TODO: These are empty for success rows because ProcessedOutputRow does not
					// carry optional input fields forward. Fix: add passthroughFields to
					// ProcessedOutputRow in types.ts and populate it in row-processor.ts.
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					// Group 3: URL check evidence
					row.currentUrlResult,
					row.httpStatus?.toString() ?? "",
					row.finalUrl ?? "",
					row.detectedPlatform ?? "",
					row.contentType ?? "",
					row.formatDetected ?? "",
					String(row.menuContentDetected),
					String(row.brandMatch),
					// Group 4: Candidate URL
					row.candidateNewUrl ?? "",
					row.candidateSource ?? "",
					// Group 5: Recommendation
					row.recommendedStatus,
					row.confidence,
					row.recommendationReason,
					// Group 6: Human review
					row.humanFinalStatus ?? "",
					row.humanComment ?? "",
					String(row.needsEscalation),
					row.escalationReason ?? "",
					// Group 7: Processing error
					"",
				]),
			);
		} else {
			const record = result.record;
			rows.push(
				serializeRow([
					// Group 1: Identity
					record.menuId,
					record.brandId,
					record.brandName,
					record.clusterId,
					record.templateName,
					record.menuUrl,
					record.scrapingStatus,
					// Group 2: Optional input passthrough
					record.menuLink ?? "",
					record.brandGatewayTaskLink ?? "",
					record.menuDefinitionTaskLink ?? "",
					record.scraper ?? "",
					record.status ?? "",
					record.comment ?? "",
					record.menuFormat ?? "",
					// Group 3: URL check evidence
					"not_checked",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					// Group 4: Candidate URL
					"",
					"",
					// Group 5: Recommendation
					"Pending",
					"low",
					"Processing error",
					// Group 6: Human review
					"",
					"",
					"false",
					"",
					// Group 7: Processing error
					result.error,
				]),
			);
		}
	}

	return rows.join("\r\n");
}
