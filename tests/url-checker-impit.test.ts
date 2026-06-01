import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkUrl } from "../src/domain/url-checker.js";

function makeFakeImpitResponse(opts: {
	status: number;
	url: string;
	contentType?: string;
}): object {
	return {
		ok: opts.status >= 200 && opts.status < 300,
		status: opts.status,
		url: opts.url,
		headers: {
			get: (name: string) =>
				name === "content-type" ? (opts.contentType ?? null) : null,
		},
	};
}

const { mockImpitFetch } = vi.hoisted(() => ({
	mockImpitFetch: vi.fn(),
}));

vi.mock("impit", () => ({
	Impit: class {
		fetch = mockImpitFetch;
	},
	ImpitError: class ImpitError extends Error {},
}));

describe("checkUrl (impit path — bot-protected platforms)", () => {
	beforeEach(() => {
		mockImpitFetch.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("Deliveroo URL, impit 200, no redirect → valid", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch.mockResolvedValue(
			makeFakeImpitResponse({ status: 200, url, contentType: "text/html" }),
		);

		expect(await checkUrl(url)).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "Deliveroo",
			contentType: "text/html",
		});
	});

	it("Deliveroo URL, impit 200, redirected URL → redirected", async () => {
		const inputUrl = "https://deliveroo.co.uk/menu/old";
		const finalUrl = "https://deliveroo.co.uk/menu/new";
		mockImpitFetch.mockResolvedValue(
			makeFakeImpitResponse({ status: 200, url: finalUrl, contentType: "text/html" }),
		);

		const result = await checkUrl(inputUrl);
		expect(result.result).toBe("redirected");
		expect(result.finalUrl).toBe(finalUrl);
		expect(result.detectedPlatform).toBe("Deliveroo");
	});

	it("Deliveroo URL, impit 403 → not_verifiable", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch.mockResolvedValue(makeFakeImpitResponse({ status: 403, url }));

		expect(await checkUrl(url)).toEqual({
			result: "not_verifiable",
			httpStatus: 403,
			detectedPlatform: "Deliveroo",
		});
	});

	it("Deliveroo URL, impit 429 → not_verifiable", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch.mockResolvedValue(makeFakeImpitResponse({ status: 429, url }));

		expect(await checkUrl(url)).toEqual({
			result: "not_verifiable",
			httpStatus: 429,
			detectedPlatform: "Deliveroo",
		});
	});

	it("Deliveroo URL, impit 404 → inaccessible", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch.mockResolvedValue(makeFakeImpitResponse({ status: 404, url }));

		expect(await checkUrl(url)).toEqual({ result: "inaccessible", httpStatus: 404 });
	});

	it("Deliveroo URL, HEAD 405 → GET retry → 200 → valid", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch
			.mockResolvedValueOnce(makeFakeImpitResponse({ status: 405, url }))
			.mockResolvedValueOnce(
				makeFakeImpitResponse({ status: 200, url, contentType: "text/html" }),
			);

		expect(await checkUrl(url)).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "Deliveroo",
			contentType: "text/html",
		});
		expect(mockImpitFetch).toHaveBeenCalledTimes(2);
	});

	it("Deliveroo URL, impit throws → unknown", async () => {
		const url = "https://deliveroo.co.uk/menu/test";
		mockImpitFetch.mockRejectedValue(new Error("unexpected impit error"));

		expect(await checkUrl(url)).toEqual({ result: "unknown" });
	});

	it("JustEat URL, impit 200, no redirect → valid", async () => {
		const url = "https://www.just-eat.co.uk/restaurants/test";
		mockImpitFetch.mockResolvedValue(
			makeFakeImpitResponse({ status: 200, url, contentType: "text/html" }),
		);

		expect(await checkUrl(url)).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "JustEat",
			contentType: "text/html",
		});
		expect(mockImpitFetch).toHaveBeenCalledTimes(1);
	});

	it("JustEat URL, impit 403 → not_verifiable", async () => {
		const url = "https://www.just-eat.co.uk/restaurants/test";
		mockImpitFetch.mockResolvedValue(makeFakeImpitResponse({ status: 403, url }));

		expect(await checkUrl(url)).toEqual({
			result: "not_verifiable",
			httpStatus: 403,
			detectedPlatform: "JustEat",
		});
	});

	it("JustEat URL, impit 429 → not_verifiable", async () => {
		const url = "https://www.just-eat.co.uk/restaurants/test";
		mockImpitFetch.mockResolvedValue(makeFakeImpitResponse({ status: 429, url }));

		expect(await checkUrl(url)).toEqual({
			result: "not_verifiable",
			httpStatus: 429,
			detectedPlatform: "JustEat",
		});
	});
});
