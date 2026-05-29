import { describe, expect, it } from "vitest";

import { CLEANUP_STATUSES, isCleanupStatus } from "../src/domain/statuses.js";

describe("cleanup statuses", () => {
	it("contains only the official final statuses", () => {
		expect(CLEANUP_STATUSES).toEqual([
			"Pending",
			"URL Updated",
			"No need to update - Still valid",
			"Excluded",
			"Format updated",
			"Moved to another brand",
			"Other",
		]);
	});

	it("checks whether a value is an official cleanup status", () => {
		expect(isCleanupStatus("URL Updated")).toBe(true);
		expect(isCleanupStatus("Needs review")).toBe(false);
		expect(isCleanupStatus(null)).toBe(false);
	});
});
