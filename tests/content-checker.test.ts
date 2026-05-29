import { describe, expect, it } from "vitest";

import { checkContentSignal } from "../src/domain/content-checker.js";

describe("checkContentSignal", () => {
	it('returns closed for UberEats body containing "Closed on Uber Eats"', () => {
		expect(checkContentSignal("Closed on Uber Eats", "UberEats")).toBe("closed");
	});

	it("returns closed for UberEats body with date suffix", () => {
		expect(
			checkContentSignal("Closed on Uber Eats as of 1 Oct 2025", "UberEats"),
		).toBe("closed");
	});

	it("returns closed for UberEats body with uppercase variant", () => {
		expect(checkContentSignal("CLOSED ON UBER EATS", "UberEats")).toBe("closed");
	});

	it("returns unknown for UberEats body without closure text", () => {
		expect(
			checkContentSignal("<html>Welcome to Some Restaurant</html>", "UberEats"),
		).toBe("unknown");
	});

	it("returns unknown for UberEats empty body", () => {
		expect(checkContentSignal("", "UberEats")).toBe("unknown");
	});

	it("returns unknown for Deliveroo regardless of body content", () => {
		expect(checkContentSignal("Closed on Uber Eats", "Deliveroo")).toBe("unknown");
	});

	it("returns unknown for JustEat platform", () => {
		expect(checkContentSignal("some menu content", "JustEat")).toBe("unknown");
	});
});
