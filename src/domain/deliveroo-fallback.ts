import { Impit } from "impit";
import { extractVisibleText } from "./content-checker.js";
import type { DeliverooPageState } from "./types.js";

type CfSession = {
	cookie: string;
	userAgent: string;
};

type SolveResult = {
	session: CfSession;
	pageState: DeliverooPageState;
};

type CookieCheckResult = {
	finalUrl: string;
	body: string;
	httpStatus: number;
};

interface DeliverooClassifierSnapshot {
	finalUrl: string;
	title: string;
	bodyText: string;
	html: string;
}

// cf_clearance is IP/UA/TLS-bound. Same-session reuse is valid only when running
// from a single host. Cross-IP reuse is untested and out of scope.
let cfSession: CfSession | null = null;
let solvePromise: Promise<SolveResult | null> | null = null;

const BLOCKED_STATUSES = new Set([403, 429]);
const CF_CHALLENGE_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 45_000;
const CF_POLL_INTERVAL_MS = 500;

export function buildBodyText(html: string): string {
	return extractVisibleText(html);
}

export function classifyDeliverooPage(
	snapshot: DeliverooClassifierSnapshot,
	menuId = "unknown",
): DeliverooPageState {
	const nextDataObj = parseNextData(snapshot.html);
	// TODO: remove after fallback is verified
	console.log(
		`[deliveroo-fallback] id=${menuId} classifier input keys=${describeObjectKeys(nextDataObj)}`,
	);

	// SIGNAL 1 — redirect
	if (!snapshot.finalUrl.includes("/menu/")) {
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} classifier=redirect finalUrl=${snapshot.finalUrl}`,
		);
		return "not_found";
	}

	// SIGNAL 2 — title
	if (/page not found|takeaway delivery in/i.test(snapshot.title)) {
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} classifier=title title=${snapshot.title}`,
		);
		return "not_found";
	}

	// SIGNAL 3 — price in bodyText
	const hasPrice = /£\d/.test(snapshot.bodyText);
	// TODO: remove after fallback is verified
	console.log(
		`[deliveroo-fallback] id=${menuId} classifier=price_pattern found=${hasPrice}`,
	);
	if (hasPrice) return "live_menu";

	// SIGNAL 4 — not-found copy in bodyText
	if (hasVisibleNotFoundText(snapshot.bodyText)) {
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} classifier=body_not_found found=true`,
		);
		return "not_found";
	}

	// SIGNAL 5 — __NEXT_DATA__ tiebreaker (last resort)
	const pageProps = getObjectPath(nextDataObj, ["props", "pageProps"]);
	if (pageProps !== null) {
		const r = classifyNextDataObject(pageProps);
		if (r !== "unknown") {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} classifier=nextdata path=pageProps result=${r}`,
			);
			return r;
		}
	}
	const menuPage = getObjectPath(nextDataObj, ["props", "initialState", "menuPage"]);
	if (menuPage !== null) {
		const r = classifyNextDataObject(menuPage);
		if (r !== "unknown") {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} classifier=nextdata path=initialState.menuPage result=${r}`,
			);
			return r;
		}
	}

	return "unknown";
}

export async function checkDeliverooWithFallback(
	url: string,
	timeoutMs = 15_000,
	menuId = "unknown",
): Promise<{ pageState: DeliverooPageState; tier: "browser" | "cookie" | "none" }> {
	if (cfSession !== null) {
		const result = await checkWithCookie(url, cfSession, timeoutMs);
		if (result !== null && !BLOCKED_STATUSES.has(result.httpStatus)) {
			const title =
				result.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
			const bodyText = buildBodyText(result.body);
			const snapshot: DeliverooClassifierSnapshot = {
				finalUrl: result.finalUrl,
				title,
				bodyText,
				html: result.body,
			};
			return logFallbackResult(
				menuId,
				classifyDeliverooPage(snapshot, menuId),
				"cookie",
			);
		}
		cfSession = null;
	}

	const alreadyInFlight = solvePromise !== null;
	if (!alreadyInFlight) {
		// TODO: remove after fallback is verified
		console.log(`[deliveroo-fallback] id=${menuId} starting CF solve`);
		solvePromise = solveCfAndGetSession(url, menuId)
			.then((result) => {
				// TODO: remove after fallback is verified
				console.log(
					`[deliveroo-fallback] id=${menuId} solve result=${result?.pageState ?? "null"} error=none`,
				);
				if (result !== null) cfSession = result.session;
				solvePromise = null;
				return result;
			})
			.catch((error: unknown) => {
				// TODO: remove after fallback is verified
				console.log(
					`[deliveroo-fallback] id=${menuId} solve result=null error=${formatError(error)}`,
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
		const title =
			result.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
		const bodyText = buildBodyText(result.body);
		const snapshot: DeliverooClassifierSnapshot = {
			finalUrl: result.finalUrl,
			title,
			bodyText,
			html: result.body,
		};
		return logFallbackResult(
			menuId,
			classifyDeliverooPage(snapshot, menuId),
			"cookie",
		);
	}

	return logFallbackResult(menuId, "unknown", "none");
}

export function resetDeliverooSessionForTesting(): void {
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
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} solve return null reason=patchright import failed error=${formatError(error)}`,
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
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=browser launch failed error=${formatError(error)}`,
			);
			return null;
		}

		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} solve target=${url} headless=true`,
		);
		const context = await browser.newContext();
		const page = await context.newPage();
		try {
			const response = await page.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: NAVIGATION_TIMEOUT_MS,
			});
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} goto status=${response?.status() ?? "none"}`,
			);
		} catch (error) {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=goto failed error=${formatError(error)}`,
			);
			return null;
		}

		const challengePassed = await waitForCfChallenge(page);
		const cookies = await context.cookies("https://deliveroo.co.uk");
		const cookieNames = cookies.map((cookie) => cookie.name).join(",") || "none";
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} challengePassed=${challengePassed} cookieNames=${cookieNames}`,
		);
		if (!challengePassed) {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=timeout waiting for Cloudflare challenge`,
			);
			return null;
		}
		await page.waitForLoadState("domcontentloaded");
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} page settled after CF redirect`,
		);

		const cfCookie = cookies.find((cookie) => cookie.name === "cf_clearance");
		if (!cfCookie) {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=no cf_clearance cookie found`,
			);
			return null;
		}

		let userAgent: string;
		try {
			userAgent = await page.evaluate(() => navigator.userAgent);
		} catch (error) {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=user agent read failed after cf_clearance error=${formatError(error)}`,
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
			html = await page.evaluate(() => document.body.innerHTML);
		} catch (error) {
			// TODO: remove after fallback is verified
			console.log(
				`[deliveroo-fallback] id=${menuId} solve return null reason=body read failed after cf_clearance finalUrl=${finalUrl} error=${formatError(error)}`,
			);
			return null;
		}

		return {
			session: { cookie: cfCookie.value, userAgent },
			pageState: classifyDeliverooPage({ finalUrl, title, bodyText, html }, menuId),
		};
	} catch (error) {
		// TODO: remove after fallback is verified
		console.log(
			`[deliveroo-fallback] id=${menuId} solve return null reason=unexpected solve exception error=${formatError(error)}`,
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

function describeObjectKeys(value: unknown): string {
	if (!isRecord(value)) return "none";
	const keys = Object.keys(value);
	return keys.length > 0 ? keys.join(",") : "none";
}

function logFallbackResult(
	menuId: string,
	pageState: DeliverooPageState,
	tier: "browser" | "cookie" | "none",
): { pageState: DeliverooPageState; tier: "browser" | "cookie" | "none" } {
	// TODO: remove after fallback is verified
	console.log(`[deliveroo-fallback] id=${menuId} pageState=${pageState}`);
	return { pageState, tier };
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function hasVisibleNotFoundText(bodyText: string): boolean {
	return /page not found|page you are looking for doesn't exist/i.test(bodyText);
}

function classifyNextDataObject(obj: Record<string, unknown>): DeliverooPageState {
	if (obj.notFound === true || obj.error != null || obj.statusCode === 404)
		return "not_found";
	if (obj.restaurant != null || obj.menu != null)
		return "live_menu";
	return "unknown";
}

function getObjectPath(
	value: unknown,
	path: readonly string[],
): Record<string, unknown> | null {
	let current: unknown = value;
	for (const key of path) {
		if (!isRecord(current)) return null;
		current = current[key];
	}
	return isRecord(current) ? current : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
