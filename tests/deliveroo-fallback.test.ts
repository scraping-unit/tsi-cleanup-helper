import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	buildBodyText,
	checkDeliverooWithFallback,
	classifyDeliverooPage,
	resetDeliverooSessionForTesting,
} from "../src/domain/deliveroo-fallback.js";

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
	return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(value)}</script></body></html>`;
}

function pagePropsHtml(pageProps: unknown): string {
	return nextData({ props: { pageProps } });
}

function initialStateMenuHtml(menuPage: unknown): string {
	return nextData({ props: { initialState: { menuPage } } });
}

function snap(
	overrides: Partial<{
		finalUrl: string;
		title: string;
		bodyText: string;
		html: string;
	}> = {},
) {
	return {
		finalUrl: "https://deliveroo.co.uk/menu/london/test",
		title: "",
		bodyText: "",
		html: "",
		...overrides,
	};
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
	body: string;
	title?: string;
	innerText?: string;
	userAgent?: string;
	cookies?: Array<{ name: string; value: string }>;
};

function makeBrowserSolve(options: FakePageOptions) {
	const page = {
		goto: vi.fn().mockResolvedValue({ status: () => 200 }),
		waitForLoadState: vi.fn().mockResolvedValue(undefined),
		title: vi.fn().mockResolvedValue(options.title ?? "Deliveroo menu"),
		waitForTimeout: vi.fn().mockResolvedValue(undefined),
		url: vi.fn().mockReturnValue(options.url),
		evaluate: vi.fn(async (fn: () => unknown) => {
			const source = String(fn);
			if (source.includes("navigator.userAgent")) {
				return options.userAgent ?? "Mock Chrome";
			}
			if (source.includes("document.title")) {
				return options.title ?? "Deliveroo menu";
			}
			if (source.includes("document.body.innerHTML")) {
				return options.body;
			}
			if (source.includes("document.body.innerText")) {
				return options.innerText ?? "";
			}
			if (source.includes("document.documentElement.innerHTML")) {
				return options.body;
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

// ---------------------------------------------------------------------------
// buildBodyText
// ---------------------------------------------------------------------------

describe("buildBodyText", () => {
	it("strips script tag content", () => {
		const result = buildBodyText(
			"<html><body><script>var x = £9.99;</script><p>Hello</p></body></html>",
		);
		expect(result).not.toMatch(/£/);
		expect(result).toContain("Hello");
	});

	it("strips style tag content", () => {
		const result = buildBodyText("<style>.foo { color: red }</style><p>Hi</p>");
		expect(result).not.toContain(".foo");
		expect(result).toContain("Hi");
	});

	it("strips remaining HTML tags", () => {
		const result = buildBodyText("<p>Fish <b>£12.50</b></p>");
		expect(result).toContain("£12.50");
		expect(result).not.toContain("<p>");
		expect(result).not.toContain("<b>");
	});

	it("collapses whitespace", () => {
		const result = buildBodyText("<p>  foo   </p>   <p>  bar  </p>");
		expect(result).toBe("foo bar");
	});
});

// ---------------------------------------------------------------------------
// classifyDeliverooPage — visible-signal tests
// ---------------------------------------------------------------------------

describe("classifyDeliverooPage", () => {
	it("redirect away from /menu/ is not_found", () => {
		expect(
			classifyDeliverooPage(
				snap({ finalUrl: "https://deliveroo.co.uk/restaurants/london/east" }),
			),
		).toBe("not_found");
	});

	it("title 'Page Not Found' is not_found", () => {
		expect(classifyDeliverooPage(snap({ title: "Page Not Found" }))).toBe(
			"not_found",
		);
	});

	it("title check is case-insensitive", () => {
		expect(classifyDeliverooPage(snap({ title: "page not found" }))).toBe(
			"not_found",
		);
	});

	it("bodyText with £9.99 is live_menu", () => {
		expect(classifyDeliverooPage(snap({ bodyText: "Burger £9.99" }))).toBe(
			"live_menu",
		);
	});

	it("bodyText 'Page Not Found' copy is not_found", () => {
		expect(
			classifyDeliverooPage(
				snap({ bodyText: "Sorry, the page you are looking for doesn't exist" }),
			),
		).toBe("not_found");
	});

	it("£ inside script tag does not produce live_menu when bodyText is stripped", () => {
		const rawHtml =
			'<script>window.__data__ = { price: "£9.99" };</script><p>Page not found</p>';
		const bodyText = buildBodyText(rawHtml);
		expect(bodyText).not.toMatch(/£\d/);
		const result = classifyDeliverooPage(
			snap({ bodyText, html: rawHtml }),
		);
		expect(result).not.toBe("live_menu");
	});

	it("snapshot with no signals is unknown", () => {
		expect(classifyDeliverooPage(snap())).toBe("unknown");
	});

	// __NEXT_DATA__ fallback — props.pageProps
	it("pageProps.restaurant non-null is live_menu", () => {
		expect(
			classifyDeliverooPage(
				snap({ html: pagePropsHtml({ restaurant: { id: "r1" } }) }),
			),
		).toBe("live_menu");
	});

	it("pageProps.menu non-null is live_menu", () => {
		expect(
			classifyDeliverooPage(snap({ html: pagePropsHtml({ menu: { id: "m1" } }) })),
		).toBe("live_menu");
	});

	it("pageProps.notFound true is not_found", () => {
		expect(
			classifyDeliverooPage(snap({ html: pagePropsHtml({ notFound: true }) })),
		).toBe("not_found");
	});

	it("pageProps.error non-null is not_found", () => {
		expect(
			classifyDeliverooPage(
				snap({ html: pagePropsHtml({ error: "not found" }) }),
			),
		).toBe("not_found");
	});

	it("pageProps.statusCode 404 is not_found", () => {
		expect(
			classifyDeliverooPage(snap({ html: pagePropsHtml({ statusCode: 404 }) })),
		).toBe("not_found");
	});

	// __NEXT_DATA__ fallback — props.initialState.menuPage
	it("initialState.menuPage.menu non-null is live_menu", () => {
		expect(
			classifyDeliverooPage(
				snap({ html: initialStateMenuHtml({ menu: { id: "m1" } }) }),
			),
		).toBe("live_menu");
	});

	it("initialState.menuPage.restaurant non-null is live_menu", () => {
		expect(
			classifyDeliverooPage(
				snap({ html: initialStateMenuHtml({ restaurant: { id: "r1" } }) }),
			),
		).toBe("live_menu");
	});
});

// ---------------------------------------------------------------------------
// checkDeliverooWithFallback
// ---------------------------------------------------------------------------

describe("checkDeliverooWithFallback", () => {
	let consoleLog: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		resetDeliverooSessionForTesting();
		mockImpitFetch.mockReset();
		mockLaunch.mockReset();
		consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
	});

	afterEach(() => {
		consoleLog.mockRestore();
	});

	it("uses browser on first solve and caches the session", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/test",
			body: pagePropsHtml({ restaurant: { id: "r1" } }),
		});

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/test",
		);

		expect(result).toEqual({ pageState: "live_menu", tier: "browser" });
		expect(mockLaunch).toHaveBeenCalledTimes(1);
	});

	it("logs fallback diagnostic markers with the menu id", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/test",
			body: pagePropsHtml({ restaurant: { id: "r1" } }),
		});

		await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/test",
			15_000,
			"menu-1",
		);

		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 starting CF solve",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 solve target=https://deliveroo.co.uk/menu/london/test headless=false",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 goto status=200",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 challengePassed=true cookieNames=cf_clearance",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 page settled after CF redirect",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			expect.stringContaining(
				"[deliveroo-fallback] id=menu-1 classifier input keys=",
			),
		);
		expect(consoleLog).toHaveBeenCalledWith(
			expect.stringContaining(
				"[deliveroo-fallback] id=menu-1 classifier=price_pattern found=",
			),
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 pageState=live_menu",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 solve result=live_menu error=none",
		);
	});

	it("uses cookie tier when a session is already present", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/first",
			body: pagePropsHtml({ restaurant: { id: "r1" } }),
		});
		await checkDeliverooWithFallback("https://deliveroo.co.uk/menu/london/first");
		mockLaunch.mockClear();
		mockImpitFetch.mockResolvedValue(
			makeCookieResponse({
				status: 200,
				url: "https://deliveroo.co.uk/menu/london/second",
				body: "<p>Cod £12.50 Chips £4.00</p>",
			}),
		);

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/second",
		);

		expect(result).toEqual({ pageState: "live_menu", tier: "cookie" });
		expect(mockLaunch).not.toHaveBeenCalled();
	});

	it("cookie tier strips script content before checking for prices", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/first",
			body: pagePropsHtml({ restaurant: { id: "r1" } }),
		});
		await checkDeliverooWithFallback("https://deliveroo.co.uk/menu/london/first");
		mockLaunch.mockClear();
		// Dead page: £ prices only in __NEXT_DATA__ script blob, not in visible body
		const deadPageHtml = `<html><head><title>Page Not Found</title></head><body>
<script id="__NEXT_DATA__">{"props":{"pageProps":{"notFound":true,"cachedMenu":{"price":"£9.99"}}}}</script>
<p>Page Not Found</p></body></html>`;
		mockImpitFetch.mockResolvedValue(
			makeCookieResponse({
				status: 200,
				url: "https://deliveroo.co.uk/menu/london/dead",
				body: deadPageHtml,
			}),
		);

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/dead",
		);

		expect(result.pageState).toBe("not_found");
		expect(result.pageState).not.toBe("live_menu");
	});

	it("clears a rejected cookie session and solves again", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/first",
			body: pagePropsHtml({ restaurant: { id: "r1" } }),
		});
		await checkDeliverooWithFallback("https://deliveroo.co.uk/menu/london/first");
		mockLaunch.mockClear();
		mockImpitFetch.mockResolvedValueOnce(
			makeCookieResponse({
				status: 403,
				url: "https://deliveroo.co.uk/menu/london/second",
				body: "blocked",
			}),
		);
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/second",
			body: "",
			innerText: "Cod £12.50 Chips £4.00",
		});

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/second",
		);

		expect(result).toEqual({ pageState: "live_menu", tier: "browser" });
		expect(mockImpitFetch).toHaveBeenCalledTimes(1);
		expect(mockLaunch).toHaveBeenCalledTimes(1);
	});

	it("shares one in-flight browser solve across concurrent calls", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/first",
			body: "",
			innerText: "Cod £12.50 Chips £4.00 Drink £2.20",
		});
		mockImpitFetch.mockResolvedValue(
			makeCookieResponse({
				status: 200,
				url: "https://deliveroo.co.uk/menu/london/second",
				body: "<p>Pizza £10.00 Salad £5.00 Water £2.00</p>",
			}),
		);

		const [first, second] = await Promise.all([
			checkDeliverooWithFallback("https://deliveroo.co.uk/menu/london/first"),
			checkDeliverooWithFallback("https://deliveroo.co.uk/menu/london/second"),
		]);

		expect(mockLaunch).toHaveBeenCalledTimes(1);
		expect(first).toEqual({ pageState: "live_menu", tier: "browser" });
		expect(second).toEqual({ pageState: "live_menu", tier: "cookie" });
	});

	it("degrades to unknown when the browser is unavailable", async () => {
		mockLaunch.mockRejectedValue(new Error("no browser"));

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/test",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "none" });
	});

	it("logs the null reason when the browser solve has no cf_clearance cookie", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/test",
			body: "Deliveroo menu",
			cookies: [{ name: "__cf_bm", value: "cookie-1" }],
		});

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/test",
			15_000,
			"menu-1",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "none" });
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 challengePassed=true cookieNames=__cf_bm",
		);
		expect(consoleLog).toHaveBeenCalledWith(
			"[deliveroo-fallback] id=menu-1 solve return null reason=no cf_clearance cookie found",
		);
	});

	it("does not treat a localized Cloudflare challenge page as solved", async () => {
		makeBrowserSolve({
			url: "https://deliveroo.co.uk/menu/london/test",
			title: "Un momento…",
			body: "Verificación de seguridad en curso challenges.cloudflare.com",
		});

		const result = await checkDeliverooWithFallback(
			"https://deliveroo.co.uk/menu/london/test",
		);

		expect(result).toEqual({ pageState: "unknown", tier: "none" });
	});
});
