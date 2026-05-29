import { describe, expect, it } from "vitest";

import { exportBatchResultsToCsv, serializeCell } from "../src/csv/exporter.js";
import type { BatchRowResult } from "../src/domain/batch-processor.js";
import type { NormalizedFailedMenuRecord } from "../src/domain/types.js";
import type { ProcessedOutputRow } from "../src/domain/types.js";

const BASE_RECORD: NormalizedFailedMenuRecord = {
	brandId: "101",
	brandName: "Acme",
	menuId: "202",
	menuUrl: "https://example.com/menu",
	scrapingStatus: "failed",
	clusterId: "cluster-1",
	templateName: "deliveroo",
	menuLink: undefined,
	brandGatewayTaskLink: undefined,
	menuDefinitionTaskLink: undefined,
	scraper: undefined,
	status: undefined,
	comment: undefined,
	menuFormat: undefined,
};

const BASE_ROW: ProcessedOutputRow = {
	menuId: "202",
	brandId: "101",
	brandName: "Acme",
	clusterId: "cluster-1",
	templateName: "deliveroo",
	currentMenuUrl: "https://example.com/menu",
	scrapingStatus: "failed",
	currentUrlResult: "valid",
	httpStatus: 200,
	finalUrl: "https://example.com/menu",
	detectedPlatform: "Deliveroo",
	contentType: "text/html",
	formatDetected: "html",
	menuContentDetected: true,
	brandMatch: true,
	recommendedStatus: "No need to update - Still valid",
	confidence: "high",
	recommendationReason: "Current URL is valid",
	needsEscalation: false,
};

const HEADER_COUNT = 32;

function parseRows(csv: string): string[][] {
	return csv.split("\r\n").map((line) => line.split(","));
}

describe("serializeCell", () => {
	it("returns value as-is when no special chars", () => {
		expect(serializeCell("hello")).toBe("hello");
	});

	it("returns empty string for empty input", () => {
		expect(serializeCell("")).toBe("");
	});

	it("wraps in quotes when value contains comma", () => {
		expect(serializeCell("a,b")).toBe('"a,b"');
	});

	it("escapes embedded double quotes as double-double-quotes", () => {
		expect(serializeCell('say "hi"')).toBe('"say ""hi"""');
	});

	it("wraps in quotes when value contains newline", () => {
		expect(serializeCell("line1\nline2")).toBe('"line1\nline2"');
	});

	it("wraps in quotes when value contains CRLF", () => {
		expect(serializeCell("line1\r\nline2")).toBe('"line1\r\nline2"');
	});
});

describe("exportBatchResultsToCsv", () => {
	it("returns header-only row for empty results", () => {
		const csv = exportBatchResultsToCsv([]);
		expect(csv.split("\r\n")).toHaveLength(1);
		expect(csv).not.toMatch(/\r\n$/);
	});

	it("header row has exactly 32 columns", () => {
		const csv = exportBatchResultsToCsv([]);
		const headers = csv.split("\r\n")[0]!.split(",");
		expect(headers).toHaveLength(HEADER_COUNT);
	});

	it("produces correct column order in header", () => {
		const csv = exportBatchResultsToCsv([]);
		const headers = csv.split("\r\n")[0]!.split(",");
		expect(headers[0]).toBe("menu_id");
		expect(headers[5]).toBe("menu_url");
		expect(headers[6]).toBe("scraping_status");
		expect(headers[14]).toBe("current_url_result");
		expect(headers[24]).toBe("recommended_status");
		expect(headers[29]).toBe("needs_escalation");
		expect(headers[31]).toBe("processing_error");
	});

	it("success row has same column count as header row", () => {
		const results: BatchRowResult[] = [{ ok: true, row: BASE_ROW }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[0]!).toHaveLength(HEADER_COUNT);
		expect(rows[1]!).toHaveLength(HEADER_COUNT);
	});

	it("success row maps identity fields under import-schema headers", () => {
		const results: BatchRowResult[] = [{ ok: true, row: BASE_ROW }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		const data = rows[1]!;
		expect(data[0]).toBe("202"); // menu_id
		expect(data[1]).toBe("101"); // brand_id
		expect(data[2]).toBe("Acme"); // brand_name
		expect(data[3]).toBe("cluster-1"); // cluster_id
		expect(data[4]).toBe("deliveroo"); // template_name
		expect(data[5]).toBe("https://example.com/menu"); // menu_url
		expect(data[6]).toBe("failed"); // scraping_status
	});

	it("success row optional input columns are empty string", () => {
		const results: BatchRowResult[] = [{ ok: true, row: BASE_ROW }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		const data = rows[1]!;
		// columns 7–13 are optional input passthrough
		for (let i = 7; i <= 13; i++) {
			expect(data[i]).toBe("");
		}
	});

	it("success row serializes computed URL evidence fields", () => {
		const results: BatchRowResult[] = [{ ok: true, row: BASE_ROW }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		const data = rows[1]!;
		expect(data[14]).toBe("valid"); // current_url_result
		expect(data[15]).toBe("200"); // http_status
		expect(data[16]).toBe("https://example.com/menu"); // final_url
		expect(data[17]).toBe("Deliveroo"); // detected_platform
		expect(data[18]).toBe("text/html"); // content_type
		expect(data[19]).toBe("html"); // format_detected
		expect(data[20]).toBe("true"); // menu_content_detected
		expect(data[21]).toBe("true"); // brand_match
	});

	it("menuContentDetected false serializes as 'false' not empty string", () => {
		const row: ProcessedOutputRow = { ...BASE_ROW, menuContentDetected: false };
		const results: BatchRowResult[] = [{ ok: true, row }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[1]![20]).toBe("false");
	});

	it("needsEscalation true serializes as 'true'", () => {
		const row: ProcessedOutputRow = { ...BASE_ROW, needsEscalation: true, escalationReason: "Reason" };
		const results: BatchRowResult[] = [{ ok: true, row }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[1]![29]).toBe("true"); // needs_escalation
		expect(rows[1]![30]).toBe("Reason"); // escalation_reason
	});

	it("brandMatch 'unknown' serializes as 'unknown'", () => {
		const row: ProcessedOutputRow = { ...BASE_ROW, brandMatch: "unknown" };
		const results: BatchRowResult[] = [{ ok: true, row }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[1]![21]).toBe("unknown");
	});

	it("httpStatus 404 serializes as '404'", () => {
		const row: ProcessedOutputRow = { ...BASE_ROW, httpStatus: 404 };
		const results: BatchRowResult[] = [{ ok: true, row }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[1]![15]).toBe("404");
	});

	it("undefined optional fields serialize as empty string", () => {
		const row: ProcessedOutputRow = {
			menuId: "202",
			brandId: "101",
			brandName: "Acme",
			clusterId: "cluster-1",
			templateName: "deliveroo",
			currentMenuUrl: "https://example.com/menu",
			scrapingStatus: "failed",
			currentUrlResult: "valid",
			menuContentDetected: false,
			brandMatch: "unknown",
			recommendedStatus: "Pending",
			confidence: "low",
			recommendationReason: "No check",
			needsEscalation: false,
		};
		const results: BatchRowResult[] = [{ ok: true, row }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		const data = rows[1]!;
		expect(data[15]).toBe(""); // http_status
		expect(data[16]).toBe(""); // final_url
		expect(data[17]).toBe(""); // detected_platform
		expect(data[22]).toBe(""); // candidate_new_url
		expect(data[27]).toBe(""); // human_final_status
		expect(data[28]).toBe(""); // human_comment
	});

	it("error row uses sentinel values for computed fields", () => {
		const result: BatchRowResult = {
			ok: false,
			index: 0,
			record: BASE_RECORD,
			error: "Something went wrong",
		};
		const rows = parseRows(exportBatchResultsToCsv([result]));
		const data = rows[1]!;
		expect(data[14]).toBe("not_checked"); // current_url_result
		expect(data[24]).toBe("Pending"); // recommended_status
		expect(data[25]).toBe("low"); // confidence
		expect(data[26]).toBe("Processing error"); // recommendation_reason
		expect(data[29]).toBe("false"); // needs_escalation
		expect(data[31]).toBe("Something went wrong"); // processing_error
	});

	it("error row populates identity fields from record", () => {
		const result: BatchRowResult = {
			ok: false,
			index: 0,
			record: BASE_RECORD,
			error: "err",
		};
		const rows = parseRows(exportBatchResultsToCsv([result]));
		const data = rows[1]!;
		expect(data[0]).toBe("202"); // menu_id
		expect(data[5]).toBe("https://example.com/menu"); // menu_url
	});

	it("error row populates optional input fields from record when present", () => {
		const record: NormalizedFailedMenuRecord = {
			...BASE_RECORD,
			menuLink: "https://link.example",
			brandGatewayTaskLink: "https://gw.example",
			scraper: "scraper-a",
			comment: "needs check",
			menuFormat: "html",
		};
		const result: BatchRowResult = { ok: false, index: 0, record, error: "err" };
		const rows = parseRows(exportBatchResultsToCsv([result]));
		const data = rows[1]!;
		expect(data[7]).toBe("https://link.example"); // menu_link
		expect(data[8]).toBe("https://gw.example"); // brand_gateway_task_link
		expect(data[10]).toBe("scraper-a"); // scraper
		expect(data[12]).toBe("needs check"); // comment
		expect(data[13]).toBe("html"); // menu_format
	});

	it("error row has same column count as header", () => {
		const result: BatchRowResult = { ok: false, index: 0, record: BASE_RECORD, error: "err" };
		const rows = parseRows(exportBatchResultsToCsv([result]));
		expect(rows[0]!).toHaveLength(HEADER_COUNT);
		expect(rows[1]!).toHaveLength(HEADER_COUNT);
	});

	it("mixed success and error rows produce correct row count", () => {
		const results: BatchRowResult[] = [
			{ ok: true, row: BASE_ROW },
			{ ok: false, index: 1, record: BASE_RECORD, error: "err" },
			{ ok: true, row: BASE_ROW },
		];
		const lines = exportBatchResultsToCsv(results).split("\r\n");
		expect(lines).toHaveLength(4); // header + 3 data rows
	});

	it("success row processing_error column is empty", () => {
		const results: BatchRowResult[] = [{ ok: true, row: BASE_ROW }];
		const rows = parseRows(exportBatchResultsToCsv(results));
		expect(rows[1]![31]).toBe(""); // processing_error
	});

	it("value containing comma in recommendation_reason is quoted", () => {
		const row: ProcessedOutputRow = {
			...BASE_ROW,
			recommendationReason: "Valid, accessible URL",
		};
		const results: BatchRowResult[] = [{ ok: true, row }];
		const csv = exportBatchResultsToCsv(results);
		expect(csv).toContain('"Valid, accessible URL"');
	});

	it("value containing double quote is escaped", () => {
		const row: ProcessedOutputRow = {
			...BASE_ROW,
			humanComment: 'reviewer said "looks good"',
		};
		const results: BatchRowResult[] = [{ ok: true, row }];
		const csv = exportBatchResultsToCsv(results);
		expect(csv).toContain('"reviewer said ""looks good"""');
	});
});
