import { describe, expect, it, vi } from "vitest";

import { processFailedMenuRecord } from "../src/domain/row-processor.js";
import type { NormalizedFailedMenuRecord, UrlCheckEvidence } from "../src/domain/types.js";

const baseRecord: NormalizedFailedMenuRecord = {
	menuId: "menu-1",
	brandId: "brand-1",
	brandName: "Test Brand",
	clusterId: "cluster-1",
	templateName: "template-1",
	menuUrl: "https://example.com/menu",
	scrapingStatus: "FAILED",
};

function makeChecker(evidence: UrlCheckEvidence) {
	return vi.fn().mockResolvedValue(evidence);
}

describe("processFailedMenuRecord", () => {
	it("copies all record fields to output row", async () => {
		const checker = makeChecker({ result: "inaccessible", httpStatus: 404 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.menuId).toBe("menu-1");
		expect(row.brandId).toBe("brand-1");
		expect(row.brandName).toBe("Test Brand");
		expect(row.clusterId).toBe("cluster-1");
		expect(row.templateName).toBe("template-1");
		expect(row.currentMenuUrl).toBe("https://example.com/menu");
		expect(row.scrapingStatus).toBe("FAILED");
	});

	it("calls urlChecker with the record menu URL", async () => {
		const checker = makeChecker({ result: "valid", httpStatus: 200 });
		await processFailedMenuRecord(baseRecord, checker);

		expect(checker).toHaveBeenCalledTimes(1);
		expect(checker).toHaveBeenCalledWith("https://example.com/menu");
	});

	it("propagates URL evidence fields to output row", async () => {
		const checker = makeChecker({
			result: "redirected",
			httpStatus: 301,
			finalUrl: "https://example.com/menu-new",
			contentType: "text/html",
		});
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.currentUrlResult).toBe("redirected");
		expect(row.httpStatus).toBe(301);
		expect(row.finalUrl).toBe("https://example.com/menu-new");
		expect(row.contentType).toBe("text/html");
	});

	it("sets menuContentDetected to false and brandMatch to unknown", async () => {
		const checker = makeChecker({ result: "valid", httpStatus: 200 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.menuContentDetected).toBe(false);
		expect(row.brandMatch).toBe("unknown");
	});

	it("leaves human fields undefined", async () => {
		const checker = makeChecker({ result: "inaccessible", httpStatus: 404 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.humanFinalStatus).toBeUndefined();
		expect(row.humanComment).toBeUndefined();
		expect(row.candidateNewUrl).toBeUndefined();
		expect(row.candidateSource).toBeUndefined();
	});

	it("recommends Excluded when URL is inaccessible and no candidate exists", async () => {
		const checker = makeChecker({ result: "inaccessible", httpStatus: 404 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.recommendedStatus).toBe("Excluded");
		expect(row.confidence).toBe("low");
		expect(row.needsEscalation).toBe(false);
	});

	it("recommends Excluded when URL is invalid", async () => {
		const checker = makeChecker({ result: "invalid" });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.recommendedStatus).toBe("Excluded");
	});

	it("recommends Other for valid URL without confirmed content or brand match", async () => {
		// menuContentDetected and brandMatch are unknown at this stage,
		// so the engine cannot confirm a matching menu and falls back to manual review
		const checker = makeChecker({ result: "valid", httpStatus: 200 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.recommendedStatus).toBe("Other");
		expect(row.confidence).toBe("low");
		expect(row.needsEscalation).toBe(true);
	});

	it("recommends Other for unknown/timeout URL result", async () => {
		const checker = makeChecker({ result: "unknown" });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.recommendedStatus).toBe("Other");
		expect(row.needsEscalation).toBe(true);
	});

	it("recommends Other for redirected URL without confirmed content", async () => {
		const checker = makeChecker({
			result: "redirected",
			httpStatus: 301,
			finalUrl: "https://other.com/menu",
		});
		const row = await processFailedMenuRecord(baseRecord, checker);

		// redirected is "unusable" → Excluded (no candidate)
		expect(row.recommendedStatus).toBe("Excluded");
	});

	it("propagates contentSignal from URL evidence to output row", async () => {
		const checker = makeChecker({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "UberEats",
			contentSignal: "closed",
		});
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.contentSignal).toBe("closed");
	});

	it("leaves contentSignal absent when URL evidence has no contentSignal", async () => {
		const checker = makeChecker({ result: "inaccessible", httpStatus: 404 });
		const row = await processFailedMenuRecord(baseRecord, checker);

		expect(row.contentSignal).toBeUndefined();
	});
});
