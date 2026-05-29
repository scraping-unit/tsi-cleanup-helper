import { describe, expect, it, vi } from "vitest";

import { processBatch } from "../src/domain/batch-processor.js";
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

function makeRecord(overrides: Partial<NormalizedFailedMenuRecord> = {}): NormalizedFailedMenuRecord {
	return { ...baseRecord, ...overrides };
}

function makeChecker(evidence: UrlCheckEvidence) {
	return vi.fn().mockResolvedValue(evidence);
}

const inaccessibleEvidence: UrlCheckEvidence = { result: "inaccessible", httpStatus: 404 };
const validEvidence: UrlCheckEvidence = { result: "valid", httpStatus: 200 };

describe("processBatch", () => {
	it("returns empty results and zero summary counts for empty input", async () => {
		const checker = makeChecker(inaccessibleEvidence);
		const result = await processBatch([], checker);

		expect(result.results).toHaveLength(0);
		expect(result.summary.total).toBe(0);
		expect(result.summary.processed).toBe(0);
		expect(result.summary.errors).toBe(0);
		expect(result.summary.byStatus["Excluded"]).toBe(0);
		expect(result.summary.byStatus["Pending"]).toBe(0);
		expect(result.summary.byConfidence["low"]).toBe(0);
		expect(result.summary.byConfidence["medium"]).toBe(0);
		expect(result.summary.byConfidence["high"]).toBe(0);
	});

	it("processes a single successful record", async () => {
		const checker = makeChecker(inaccessibleEvidence);
		const result = await processBatch([baseRecord], checker);

		expect(result.results).toHaveLength(1);
		expect(result.results[0]!.ok).toBe(true);
		expect(result.summary.total).toBe(1);
		expect(result.summary.processed).toBe(1);
		expect(result.summary.errors).toBe(0);
	});

	it("aggregates byStatus counts across multiple records", async () => {
		const records = [
			makeRecord({ menuId: "menu-1" }),
			makeRecord({ menuId: "menu-2" }),
			makeRecord({ menuId: "menu-3" }),
		];
		const checker = makeChecker(inaccessibleEvidence);
		const result = await processBatch(records, checker);

		// inaccessible + no candidate → Excluded
		expect(result.summary.processed).toBe(3);
		expect(result.summary.byStatus["Excluded"]).toBe(3);
		expect(result.summary.byStatus["Other"]).toBe(0);
	});

	it("captures per-row errors without stopping the batch", async () => {
		const records = [
			makeRecord({ menuId: "menu-1" }),
			makeRecord({ menuId: "menu-2" }),
			makeRecord({ menuId: "menu-3" }),
		];
		const checker = vi
			.fn()
			.mockResolvedValueOnce(inaccessibleEvidence)
			.mockRejectedValueOnce(new Error("network timeout"))
			.mockResolvedValue(inaccessibleEvidence);

		const result = await processBatch(records, checker);

		expect(result.summary.total).toBe(3);
		expect(result.summary.processed).toBe(2);
		expect(result.summary.errors).toBe(1);
		expect(result.results[0]!.ok).toBe(true);
		expect(result.results[1]!.ok).toBe(false);
		expect(result.results[2]!.ok).toBe(true);
	});

	it("sets index and error message on BatchRowError", async () => {
		const records = [
			makeRecord({ menuId: "menu-1" }),
			makeRecord({ menuId: "menu-2" }),
		];
		const checker = vi
			.fn()
			.mockRejectedValueOnce(new Error("fetch failed"))
			.mockResolvedValue(inaccessibleEvidence);

		const result = await processBatch(records, checker);
		const first = result.results[0];

		expect(first?.ok).toBe(false);
		if (first && !first.ok) {
			expect(first.index).toBe(0);
			expect(first.error).toBe("fetch failed");
			expect(first.record.menuId).toBe("menu-1");
		}
	});

	it("handles all records throwing errors", async () => {
		const records = [makeRecord({ menuId: "menu-1" }), makeRecord({ menuId: "menu-2" })];
		const checker = vi.fn().mockRejectedValue(new Error("timeout"));

		const result = await processBatch(records, checker);

		expect(result.summary.total).toBe(2);
		expect(result.summary.processed).toBe(0);
		expect(result.summary.errors).toBe(2);
		expect(result.summary.byStatus["Excluded"]).toBe(0);
		expect(result.summary.byConfidence["low"]).toBe(0);
		const r0 = result.results[0];
		const r1 = result.results[1];
		expect(r0?.ok).toBe(false);
		expect(r1?.ok).toBe(false);
		if (r1 && !r1.ok) {
			expect(r1.index).toBe(1);
		}
	});

	it("counts mixed statuses correctly in byStatus", async () => {
		const records = [
			makeRecord({ menuId: "menu-1" }),
			makeRecord({ menuId: "menu-2" }),
			makeRecord({ menuId: "menu-3" }),
		];
		// inaccessible → Excluded; valid → Other (no confirmed content/brand)
		const checker = vi
			.fn()
			.mockResolvedValueOnce(inaccessibleEvidence)
			.mockResolvedValueOnce(validEvidence)
			.mockResolvedValue(inaccessibleEvidence);

		const result = await processBatch(records, checker);

		expect(result.summary.byStatus["Excluded"]).toBe(2);
		expect(result.summary.byStatus["Other"]).toBe(1);
		expect(result.summary.byStatus["Pending"]).toBe(0);
		expect(result.summary.byStatus["URL Updated"]).toBe(0);
	});

	it("counts byConfidence correctly and initializes all keys to zero", async () => {
		const checker = makeChecker(inaccessibleEvidence);
		const result = await processBatch([baseRecord, makeRecord({ menuId: "menu-2" })], checker);

		// Both rows produce low confidence (Excluded with no candidate)
		expect(result.summary.byConfidence["low"]).toBe(2);
		expect(result.summary.byConfidence["medium"]).toBe(0);
		expect(result.summary.byConfidence["high"]).toBe(0);
	});
});
