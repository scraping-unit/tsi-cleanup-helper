import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	checkJustEatWithFallback,
	classifyJustEatPage,
	resetJustEatSessionForTesting,
} from "../src/domain/justeat-fallback.js";

const { mockImpitFetch, mockLaunch } = vi.hoisted(() => ({
	mockImpitFetch: vi.fn(),
	mockLaunch: vi.fn(),
}));

vi.mock("impit", () => ({
	Impit: class {
		fetch = mockImpitFetch;
	},
}));

vi.mock("patchright", () => ({
	chromium: {
		launch: mockLaunch,
	},
}));

function nextData(value: unknown): string {
	return `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(value)}</script></head><body><main>Menu</main></body></html>`;
}

function makeCookieResponse(opts: {
	status: number;
	url: string;
	body: string;
}): object {
	return {
		status: opts.status,
		url: opts.url,
		text: vi.fn().mockResolvedValue(opts.body),
	};
}

type FakePageOptions = {
	url: string;
	html: string;
	title?: string;
	innerText?: string;
	userAgent?: string;
	cookies?: Array<{ name: string; value: string }>;
};

function makeBrowserSolve(options: FakePageOptions) {
	const page = {
		goto: vi.fn().mockResolvedValue({ status: () => 200 }),
		waitForLoadState: vi.fn().mockResolvedValue(undefined),
		title: vi.fn().mockResolvedValue(options.title ?? "Just Eat menu"),
		waitForTimeout: vi.fn().mockResolvedValue(undefined),
		url: vi.fn().mockReturnValue(options.url),
		evaluate: vi.fn(async (fn: () => unknown) => {
			const source = String(fn);
			if (source.includes("navigator.userAgent")) {
				return options.userAgent ?? "Mock Chrome";
			}
			if (source.includes("document.title")) {
				return options.title ?? "Just Eat menu";
			}
			if (source.includes("document.body.innerText")) {
				return options.innerText ?? "";
			}
			if (source.includes("document.documentElement.innerHTML")) {
				return options.html;
			}
			return null;
		}),
	};
	const context = {
		newPage: vi.fn().mockResolvedValue(page),
		cookies: vi
			.fn()
			.mockResolvedValue(
				options.cookies ?? [{ name: "cf_clearance", value: "cookie-1" }],
			),
	};
	const browser = {
		newContext: vi.fn().mockResolvedValue(context),
		close: vi.fn().mockResolvedValue(undefined),
	};
	mockLaunch.mockResolvedValue(browser);
	return { browser, context, page };
}

describe("checkJustEatWithFallback", () => {
	let consoleLog: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		resetJustEatSessionForTesting();
		mockImpitFetch.mockReset();
		mockLaunch.mockReset();
		consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
	});

	afterEach(() => {
		consoleLog.mockRestore();
	});

	it("uses browser on first solve, logs page diagnostics, and returns unknown", async () => {
		makeBrowserSolve({
			url: "https://www.just-eat.co.uk/restaurants/test/menu",
			title: "Test Restaurant - Just Eat",
			innerText: "Fish and chips \u00a39.99",
			html: nextData({ props: {}, buildId: "build-1" }),
		});

		const result = await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/test/menu",
			15_000,
			"menu-1",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "browser" });
		expect(mockLaunch).toHaveBeenCalledTimes(1);
		expect(consoleLog).toHaveBeenCalledWith(
			"[justeat-fallback] id=menu-1 page finalUrl=https://www.just-eat.co.uk/restaurants/test/menu title=Test Restaurant - Just Eat bodyPreview=Fish and chips \u00a39.99 pricePattern=true nextDataKeys=props,buildId",
		);
	});

	it("uses cookie tier when a session is already present and logs diagnostics", async () => {
		makeBrowserSolve({
			url: "https://www.just-eat.co.uk/restaurants/first/menu",
			html: nextData({ props: {} }),
		});
		await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/first/menu",
		);
		mockLaunch.mockClear();
		mockImpitFetch.mockResolvedValue(
			makeCookieResponse({
				status: 200,
				url: "https://www.just-eat.co.uk/restaurants/second/menu",
				body: `<html><head><title>Second Restaurant</title></head><body>${"A".repeat(210)} \u00a312.50</body></html>`,
			}),
		);

		const result = await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/second/menu",
			15_000,
			"menu-2",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "cookie" });
		expect(mockLaunch).not.toHaveBeenCalled();
		expect(consoleLog).toHaveBeenCalledWith(
			`[justeat-fallback] id=menu-2 page finalUrl=https://www.just-eat.co.uk/restaurants/second/menu title=Second Restaurant bodyPreview=${"A".repeat(200)} pricePattern=true nextDataKeys=none`,
		);
	});

	it("clears a rejected cookie session and solves again", async () => {
		makeBrowserSolve({
			url: "https://www.just-eat.co.uk/restaurants/first/menu",
			html: nextData({ props: {} }),
		});
		await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/first/menu",
		);
		mockLaunch.mockClear();
		mockImpitFetch.mockResolvedValueOnce(
			makeCookieResponse({
				status: 403,
				url: "https://www.just-eat.co.uk/restaurants/second/menu",
				body: "blocked",
			}),
		);
		makeBrowserSolve({
			url: "https://www.just-eat.co.uk/restaurants/second/menu",
			html: nextData({ props: {} }),
		});

		const result = await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/second/menu",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "browser" });
		expect(mockImpitFetch).toHaveBeenCalledTimes(1);
		expect(mockLaunch).toHaveBeenCalledTimes(1);
	});

	it("degrades to unknown when the browser is unavailable", async () => {
		mockLaunch.mockRejectedValue(new Error("no browser"));

		const result = await checkJustEatWithFallback(
			"https://www.just-eat.co.uk/restaurants/test/menu",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "none" });
	});
});

describe("classifyJustEatPage", () => {
	it("generic local listing title is not_found", () => {
		expect(
			classifyJustEatPage({
				finalUrl: "https://www.just-eat.co.uk/restaurants-manchester",
				title: "Restaurants and takeaways in Manchester",
				bodyText: "",
				html: "",
			}),
		).toBe("not_found");
	});

	it("restaurant menu title remains unknown", () => {
		expect(
			classifyJustEatPage({
				finalUrl: "https://www.just-eat.co.uk/restaurants-test/menu",
				title: "Test Restaurant - Just Eat",
				bodyText: "Menu",
				html: "",
			}),
		).toBe("unknown");
	});
});
