import { Impit } from "impit";
import { extractHtmlTitle, extractVisibleText } from "./content-checker.js";
import type { JustEatPageState } from "./types.js";

type FallbackTier = "browser" | "cookie" | "none";

type CfSession = {
	cookie: string;
	userAgent: string;
};

type SolveResult = {
	session: CfSession;
	pageState: JustEatPageState;
};

type CookieCheckResult = {
	finalUrl: string;
	body: string;
	httpStatus: number;
};

export type JustEatSnapshot = {
	finalUrl: string;
	title: string;
	bodyText: string;
	html: string;
};

let cfSession: CfSession | null = null;
let solvePromise: Promise<SolveResult | null> | null = null;

const BLOCKED_STATUSES = new Set([403, 429]);
const CF_CHALLENGE_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 45_000;
const CF_POLL_INTERVAL_MS = 500;
const JUSTEAT_COOKIE_ORIGIN = "https://www.just-eat.co.uk";

export async function checkJustEatWithFallback(
	url: string,
	timeoutMs = 15_000,
	menuId = "unknown",
): Promise<{ pageState: JustEatPageState; tier: FallbackTier }> {
	if (cfSession !== null) {
		const result = await checkWithCookie(url, cfSession, timeoutMs);
		if (result !== null && !BLOCKED_STATUSES.has(result.httpStatus)) {
			const snapshot = snapshotFromHtml(result.finalUrl, result.body);
			logJustEatSnapshot(menuId, snapshot);
			return logFallbackResult(menuId, classifyJustEatPage(snapshot), "cookie");
		}
		cfSession = null;
	}

	const alreadyInFlight = solvePromise !== null;
	if (!alreadyInFlight) {
		console.log(`[justeat-fallback] id=${menuId} starting CF solve`);
		solvePromise = solveCfAndGetSession(url, menuId)
			.then((result) => {
				console.log(
					`[justeat-fallback] id=${menuId} solve result=${result?.pageState ?? "null"} error=none`,
				);
				if (result !== null) cfSession = result.session;
				solvePromise = null;
				return result;
			})
			.catch((error: unknown) => {
				console.log(
					`[justeat-fallback] id=${menuId} solve result=null error=${formatError(error)}`,
				);
				solvePromise = null;
				return null;
			});
	}

	const capturedPromise = solvePromise;
	if (capturedPromise === null) {
		return logFallbackResult(menuId, "unknown", "none");
	}
	const solveResult = await capturedPromise;

	if (solveResult === null) {
		return logFallbackResult(menuId, "unknown", "none");
	}

	if (!alreadyInFlight) {
		return logFallbackResult(menuId, solveResult.pageState, "browser");
	}

	const result = await checkWithCookie(url, solveResult.session, timeoutMs);
	if (result !== null && !BLOCKED_STATUSES.has(result.httpStatus)) {
		const snapshot = snapshotFromHtml(result.finalUrl, result.body);
		logJustEatSnapshot(menuId, snapshot);
		return logFallbackResult(menuId, classifyJustEatPage(snapshot), "cookie");
	}

	return logFallbackResult(menuId, "unknown", "none");
}

export function resetJustEatSessionForTesting(): void {
	cfSession = null;
	solvePromise = null;
}

async function solveCfAndGetSession(
	url: string,
	menuId: string,
): Promise<SolveResult | null> {
	let patchright: typeof import("patchright");
	try {
		patchright = await import("patchright");
	} catch (error) {
		console.log(
			`[justeat-fallback] id=${menuId} solve return null reason=patchright import failed error=${formatError(error)}`,
		);
		return null;
	}

	let browser: Awaited<ReturnType<typeof patchright.chromium.launch>> | null = null;
	try {
		try {
			browser = await patchright.chromium.launch({
				channel: "chrome",
				headless: true,
			});
		} catch (error) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=browser launch failed error=${formatError(error)}`,
			);
			return null;
		}

		console.log(
			`[justeat-fallback] id=${menuId} solve target=${url} headless=true`,
		);
		const context = await browser.newContext();
		const page = await context.newPage();
		try {
			const response = await page.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: NAVIGATION_TIMEOUT_MS,
			});
			console.log(
				`[justeat-fallback] id=${menuId} goto status=${response?.status() ?? "none"}`,
			);
		} catch (error) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=goto failed error=${formatError(error)}`,
			);
			return null;
		}

		const challengePassed = await waitForCfChallenge(page);
		const cookies = await context.cookies(JUSTEAT_COOKIE_ORIGIN);
		const cookieNames = cookies.map((cookie) => cookie.name).join(",") || "none";
		console.log(
			`[justeat-fallback] id=${menuId} challengePassed=${challengePassed} cookieNames=${cookieNames}`,
		);
		if (!challengePassed) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=timeout waiting for Cloudflare challenge`,
			);
			return null;
		}
		await page.waitForLoadState("domcontentloaded");
		console.log(`[justeat-fallback] id=${menuId} page settled after CF redirect`);

		const cfCookie = cookies.find((cookie) => cookie.name === "cf_clearance");
		if (!cfCookie) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=no cf_clearance cookie found`,
			);
			return null;
		}

		let userAgent: string;
		try {
			userAgent = await page.evaluate(() => navigator.userAgent);
		} catch (error) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=user agent read failed after cf_clearance error=${formatError(error)}`,
			);
			return null;
		}

		const finalUrl = page.url();
		let title: string;
		let bodyText: string;
		let html: string;
		try {
			title = await page.evaluate(() => document.title);
			bodyText = await page.evaluate(() => document.body.innerText);
			html = await page.evaluate(() => document.documentElement.innerHTML);
		} catch (error) {
			console.log(
				`[justeat-fallback] id=${menuId} solve return null reason=body read failed after cf_clearance finalUrl=${finalUrl} error=${formatError(error)}`,
			);
			return null;
		}

		const snapshot = { finalUrl, title, bodyText, html };
		logJustEatSnapshot(menuId, snapshot);
		return {
			session: { cookie: cfCookie.value, userAgent },
			pageState: classifyJustEatPage(snapshot),
		};
	} catch (error) {
		console.log(
			`[justeat-fallback] id=${menuId} solve return null reason=unexpected solve exception error=${formatError(error)}`,
		);
		return null;
	} finally {
		await browser?.close().catch(() => undefined);
	}
}

async function waitForCfChallenge(page: {
	title: () => Promise<string>;
	evaluate: <T>(fn: () => T) => Promise<T>;
	waitForTimeout: (timeoutMs: number) => Promise<void>;
}): Promise<boolean> {
	const maxPolls = Math.ceil(CF_CHALLENGE_TIMEOUT_MS / CF_POLL_INTERVAL_MS);

	for (let i = 0; i < maxPolls; i++) {
		const title = await page.title().catch(() => "");
		const bodyText = await page
			.evaluate(() => document.body.innerText.slice(0, 500))
			.catch(() => "");
		const html = await page
			.evaluate(() => document.documentElement.innerHTML.slice(0, 2_000))
			.catch(() => "");

		if (!isCloudflareChallengePage(title, bodyText, html)) {
			return true;
		}

		await page.waitForTimeout(CF_POLL_INTERVAL_MS).catch(() => undefined);
	}

	return false;
}

function isCloudflareChallengePage(
	title: string,
	bodyText: string,
	html: string,
): boolean {
	const visibleText = `${title}\n${bodyText}`;
	return (
		/just a moment|un momento|verificaci[oó]n de seguridad|checking your browser|verify you are human/i.test(
			visibleText,
		) || /challenges\.cloudflare\.com|cf-chl|cf_clearance/i.test(html)
	);
}

async function checkWithCookie(
	url: string,
	session: CfSession,
	timeoutMs: number,
): Promise<CookieCheckResult | null> {
	const client = new Impit({ browser: "chrome" });
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await client.fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
			headers: {
				Cookie: `cf_clearance=${session.cookie}`,
				"User-Agent": session.userAgent,
			},
		});
		clearTimeout(timer);
		const body = await response.text();
		return {
			finalUrl: response.url,
			body,
			httpStatus: response.status,
		};
	} catch {
		clearTimeout(timer);
		return null;
	}
}

function snapshotFromHtml(finalUrl: string, html: string): JustEatSnapshot {
	return {
		finalUrl,
		title: extractHtmlTitle(html),
		bodyText: extractVisibleText(html),
		html,
	};
}

export function classifyJustEatPage(snapshot: JustEatSnapshot): JustEatPageState {
	return /restaurants and takeaways in/i.test(snapshot.title)
		? "not_found"
		: "unknown";
}

function logJustEatSnapshot(menuId: string, snapshot: JustEatSnapshot): void {
	const bodyText = normalizeBodyText(snapshot.bodyText);
	const bodyPreview = bodyText.slice(0, 200);
	const pricePattern = /£\d/.test(bodyText);
	const nextDataKeys = getNextDataTopLevelKeys(snapshot.html);
	console.log(
		`[justeat-fallback] id=${menuId} page finalUrl=${snapshot.finalUrl} title=${snapshot.title} bodyPreview=${bodyPreview} pricePattern=${pricePattern} nextDataKeys=${nextDataKeys}`,
	);
}

function normalizeBodyText(bodyText: string): string {
	return bodyText.replace(/\s+/g, " ").trim();
}

function getNextDataTopLevelKeys(html: string): string {
	const nextData = parseNextData(html);
	if (!isRecord(nextData)) return "none";
	const keys = Object.keys(nextData);
	return keys.length > 0 ? keys.join(",") : "none";
}

function parseNextData(html: string): unknown {
	const match = html.match(
		/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/,
	);
	if (!match?.[1]) return null;

	try {
		return JSON.parse(match[1]);
	} catch {
		return null;
	}
}

function logFallbackResult(
	menuId: string,
	pageState: JustEatPageState,
	tier: FallbackTier,
): { pageState: JustEatPageState; tier: FallbackTier } {
	console.log(`[justeat-fallback] id=${menuId} pageState=${pageState}`);
	return { pageState, tier };
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
