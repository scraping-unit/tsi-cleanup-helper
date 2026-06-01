import { afterEach, describe, expect, it, vi } from "vitest";

import { checkUrl } from "../src/domain/url-checker.js";

function makeFakeResponse(opts: {
	status: number;
	url: string;
	contentType?: string;
}): Response {
	return {
		ok: opts.status >= 200 && opts.status < 300,
		status: opts.status,
		url: opts.url,
		headers: {
			get: (name: string) =>
				name === "content-type" ? (opts.contentType ?? null) : null,
		},
	} as unknown as Response;
}

describe("checkUrl", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns invalid for empty string", async () => {
		expect(await checkUrl("")).toEqual({ result: "invalid" });
	});

	it("returns invalid for whitespace-only string", async () => {
		expect(await checkUrl("   ")).toEqual({ result: "invalid" });
	});

	it("returns invalid for unparseable URL", async () => {
		expect(await checkUrl("not a url")).toEqual({ result: "invalid" });
	});

	it("returns invalid for non-http/https protocol", async () => {
		expect(await checkUrl("ftp://example.com/menu")).toEqual({
			result: "invalid",
		});
	});

	it("returns valid for 200 response with no redirect", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeFakeResponse({
					status: 200,
					url: "https://example.com/menu",
					contentType: "text/html",
				}),
			),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "OwnWebsite",
			contentType: "text/html",
		});
	});

	it("returns redirected when final URL differs from original", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeFakeResponse({
					status: 200,
					url: "https://example.com/menu/new-path",
					contentType: "text/html",
				}),
			),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "redirected",
			httpStatus: 200,
			finalUrl: "https://example.com/menu/new-path",
			detectedPlatform: "OwnWebsite",
			contentType: "text/html",
		});
	});

	it("detects platform from final redirect URL", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeFakeResponse({
					status: 200,
					url: "https://deliveroo.co.uk/menu/example",
					contentType: "text/html",
				}),
			),
		);

		const result = await checkUrl("https://example.com/old-menu");
		expect(result.result).toBe("redirected");
		expect(result.detectedPlatform).toBe("Deliveroo");
		expect(result.finalUrl).toBe("https://deliveroo.co.uk/menu/example");
	});

	it("returns inaccessible for 404", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeFakeResponse({ status: 404, url: "https://example.com/menu" }),
			),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "inaccessible",
			httpStatus: 404,
		});
	});

	it("returns blocked for 403, no GET fallback", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({ status: 403, url: "https://example.com/menu" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "blocked",
			httpStatus: 403,
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns inaccessible for 500", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				makeFakeResponse({ status: 500, url: "https://example.com/menu" }),
			),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "inaccessible",
			httpStatus: 500,
		});
	});

	it("returns unknown on abort (timeout)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(
				Object.assign(new Error("The operation was aborted"), {
					name: "AbortError",
				}),
			),
		);

		expect(await checkUrl("https://example.com/menu", 1)).toEqual({
			result: "unknown",
		});
	});

	it("returns inaccessible on DNS/network error (TypeError)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "inaccessible",
		});
	});

	it("returns unknown on unexpected error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new Error("Unexpected")),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "unknown",
		});
	});

	it("does not call GET when HEAD succeeds", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({
				status: 200,
				url: "https://example.com/menu",
				contentType: "text/html",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await checkUrl("https://example.com/menu");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("sends browser-like headers on every request", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({
				status: 200,
				url: "https://example.com/menu",
				contentType: "text/html",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await checkUrl("https://example.com/menu");

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const headers = init.headers as Record<string, string>;
		expect(headers["User-Agent"]).toContain("Chrome");
		expect(headers["Accept"]).toContain("text/html");
		expect(headers["Accept-Language"]).toContain("en-GB");
	});

	it("falls back to GET on HEAD 405 and returns valid", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
				)
				.mockResolvedValueOnce(
					makeFakeResponse({
						status: 200,
						url: "https://example.com/menu",
						contentType: "text/html",
					}),
				),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "OwnWebsite",
			contentType: "text/html",
		});
	});

	it("falls back to GET on HEAD 405 and returns redirected", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
				)
				.mockResolvedValueOnce(
					makeFakeResponse({
						status: 200,
						url: "https://deliveroo.co.uk/menu/example",
						contentType: "text/html",
					}),
				),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "redirected",
			httpStatus: 200,
			finalUrl: "https://deliveroo.co.uk/menu/example",
			detectedPlatform: "Deliveroo",
			contentType: "text/html",
		});
	});

	it("falls back to GET on HEAD 405 and returns inaccessible when GET also fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
				)
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 404, url: "https://example.com/menu" }),
				),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "inaccessible",
			httpStatus: 404,
		});
	});

	it("falls back to GET on HEAD 405 and returns unknown when GET times out", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
				)
				.mockRejectedValueOnce(
					Object.assign(new Error("The operation was aborted"), {
						name: "AbortError",
					}),
				),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "unknown",
		});
	});

	it("falls back to GET on HEAD 405 and returns inaccessible when GET has network error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
				)
				.mockRejectedValueOnce(new TypeError("Failed to fetch")),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "inaccessible",
		});
	});

	it("falls back to GET on HEAD 501 and returns valid", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 501, url: "https://example.com/menu" }),
				)
				.mockResolvedValueOnce(
					makeFakeResponse({
						status: 200,
						url: "https://example.com/menu",
						contentType: "text/html",
					}),
				),
		);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "valid",
			httpStatus: 200,
			detectedPlatform: "OwnWebsite",
			contentType: "text/html",
		});
	});

	it("HEAD 405 → GET 403 → returns blocked", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeFakeResponse({ status: 405, url: "https://example.com/menu" }),
			)
			.mockResolvedValueOnce(
				makeFakeResponse({ status: 403, url: "https://example.com/menu" }),
			);
		vi.stubGlobal("fetch", fetchMock);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "blocked",
			httpStatus: 403,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("returns blocked for 429, no GET fallback", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({ status: 429, url: "https://example.com/menu" }),
		);
		vi.stubGlobal("fetch", fetchMock);

		expect(await checkUrl("https://example.com/menu")).toEqual({
			result: "blocked",
			httpStatus: 429,
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("UberEats URL with closure body returns contentSignal closed", async () => {
		const ubereatsUrl = "https://www.ubereats.com/store/some-restaurant/abc";
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 200, url: ubereatsUrl, contentType: "text/html" }),
				)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue("Closed on Uber Eats as of 1 Oct 2025"),
				}),
		);

		const result = await checkUrl(ubereatsUrl);
		expect(result.detectedPlatform).toBe("UberEats");
		expect(result.contentSignal).toBe("closed");
	});

	it("UberEats URL without closure body returns contentSignal unknown", async () => {
		const ubereatsUrl = "https://www.ubereats.com/store/some-restaurant/abc";
		vi.stubGlobal(
			"fetch",
			vi.fn()
				.mockResolvedValueOnce(
					makeFakeResponse({ status: 200, url: ubereatsUrl, contentType: "text/html" }),
				)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue("<html>Welcome to Some Restaurant</html>"),
				}),
		);

		const result = await checkUrl(ubereatsUrl);
		expect(result.detectedPlatform).toBe("UberEats");
		expect(result.contentSignal).toBe("unknown");
	});

	it("non-UberEats URL does not trigger a content fetch", async () => {
		const url = "https://foodhub.co.uk/menu/test";
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({
				status: 200,
				url,
				contentType: "text/html",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await checkUrl(url);
		expect(result.detectedPlatform).toBe("Foodhub");
		expect(result.contentSignal).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("UberEats URL with HEAD 403 returns blocked without content fetch", async () => {
		const ubereatsUrl = "https://www.ubereats.com/store/some-restaurant/abc";
		const fetchMock = vi.fn().mockResolvedValue(
			makeFakeResponse({ status: 403, url: ubereatsUrl }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await checkUrl(ubereatsUrl);
		expect(result.result).toBe("blocked");
		expect(result.contentSignal).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("UberEats URL fetches content from finalUrl after redirect", async () => {
		const inputUrl = "https://www.ubereats.com/store/old-path";
		const finalUrl = "https://www.ubereats.com/store/new-path";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeFakeResponse({ status: 200, url: finalUrl, contentType: "text/html" }),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue("Closed on Uber Eats"),
			});
		vi.stubGlobal("fetch", fetchMock);

		const result = await checkUrl(inputUrl);
		expect(result.result).toBe("redirected");
		expect(result.contentSignal).toBe("closed");
		const [contentFetchUrl] = fetchMock.mock.calls[1] as [string];
		expect(contentFetchUrl).toBe(finalUrl);
	});
});
