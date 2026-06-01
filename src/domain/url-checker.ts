import { Impit } from "impit";
import type { ImpitResponse } from "impit";
import { checkContentSignal } from "./content-checker.js";
import { detectMenuPlatformFromUrl } from "./platform-detection.js";
import type { MenuPlatform } from "./platform-detection.js";
import type { UrlCheckEvidence } from "./types.js";

const DEFAULT_TIMEOUT_MS = 10_000;

const ENHANCED_CHECK_PLATFORMS = new Set<MenuPlatform>(["Deliveroo", "JustEat"]);

const impitClient = new Impit({ browser: "chrome" });

const BROWSER_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-GB,en;q=0.9",
};

// 403/429 indicate bot protection — treat as blocked, not a method mismatch.
// HEAD fallback to GET only for method-rejection codes (405, 501).
const FALLBACK_TO_GET_STATUSES = new Set([405, 501]);
const BLOCKED_STATUSES = new Set([403, 429]);

const CONTENT_DETECTABLE_PLATFORMS = new Set<MenuPlatform>(["UberEats"]);

export async function checkUrl(
	url: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<UrlCheckEvidence> {
	if (!url || !url.trim()) {
		return { result: "invalid" };
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url.trim());
	} catch {
		return { result: "invalid" };
	}

	if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
		return { result: "invalid" };
	}

	const normalizedInputUrl = parsedUrl.href;

	if (ENHANCED_CHECK_PLATFORMS.has(detectMenuPlatformFromUrl(normalizedInputUrl))) {
		return checkUrlWithImpit(normalizedInputUrl, timeoutMs);
	}

	const headOutcome = await attemptFetch(normalizedInputUrl, "HEAD", timeoutMs);

	if (headOutcome.type === "response") {
		if (headOutcome.response.ok) {
			const evidence = buildEvidence(headOutcome.response, normalizedInputUrl);
			return maybeEnrichWithContentSignal(evidence, normalizedInputUrl, timeoutMs);
		}
		if (BLOCKED_STATUSES.has(headOutcome.response.status)) {
			return { result: "blocked", httpStatus: headOutcome.response.status };
		}
		if (FALLBACK_TO_GET_STATUSES.has(headOutcome.response.status)) {
			return attemptGet(normalizedInputUrl, timeoutMs);
		}
		return {
			result: "inaccessible",
			httpStatus: headOutcome.response.status,
		};
	}

	if (headOutcome.type === "abort") return { result: "unknown" };
	if (headOutcome.type === "network") return { result: "inaccessible" };
	return { result: "unknown" };
}

type FetchOutcome =
	| { type: "response"; response: Response }
	| { type: "abort" }
	| { type: "network" }
	| { type: "error" };

async function attemptFetch(
	url: string,
	method: "HEAD" | "GET",
	timeoutMs: number,
): Promise<FetchOutcome> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method,
			redirect: "follow",
			signal: controller.signal,
			headers: {
				...BROWSER_HEADERS,
				...(method === "GET" ? { Range: "bytes=0-0" } : {}),
			},
		});
		clearTimeout(timer);
		return { type: "response", response };
	} catch (error) {
		clearTimeout(timer);
		if (isAbortError(error)) return { type: "abort" };
		if (error instanceof TypeError) return { type: "network" };
		return { type: "error" };
	}
}

async function attemptGet(
	normalizedInputUrl: string,
	timeoutMs: number,
): Promise<UrlCheckEvidence> {
	const outcome = await attemptFetch(normalizedInputUrl, "GET", timeoutMs);

	if (outcome.type === "response") {
		if (outcome.response.ok) {
			return buildEvidence(outcome.response, normalizedInputUrl);
		}
		if (BLOCKED_STATUSES.has(outcome.response.status)) {
			return { result: "blocked", httpStatus: outcome.response.status };
		}
		return { result: "inaccessible", httpStatus: outcome.response.status };
	}

	if (outcome.type === "abort") return { result: "unknown" };
	if (outcome.type === "network") return { result: "inaccessible" };
	return { result: "unknown" };
}

async function fetchBodyText(url: string, timeoutMs: number): Promise<string | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, {
			method: "GET",
			redirect: "follow",
			signal: controller.signal,
			headers: BROWSER_HEADERS,
		});
		clearTimeout(timer);
		if (!response.ok) return null;
		return await response.text();
	} catch {
		clearTimeout(timer);
		return null;
	}
}

async function maybeEnrichWithContentSignal(
	evidence: UrlCheckEvidence,
	url: string,
	timeoutMs: number,
): Promise<UrlCheckEvidence> {
	if (!evidence.detectedPlatform || !CONTENT_DETECTABLE_PLATFORMS.has(evidence.detectedPlatform)) {
		return evidence;
	}
	const fetchUrl = evidence.finalUrl ?? url;
	const body = await fetchBodyText(fetchUrl, timeoutMs);
	if (body === null) return evidence;
	const contentSignal = checkContentSignal(body, evidence.detectedPlatform);
	return { ...evidence, contentSignal };
}

function buildEvidence(
	response: Response,
	normalizedInputUrl: string,
): UrlCheckEvidence {
	const finalUrl = response.url;
	const isRedirected = finalUrl !== "" && finalUrl !== normalizedInputUrl;
	const detectedPlatform = detectMenuPlatformFromUrl(
		isRedirected ? finalUrl : normalizedInputUrl,
	);
	const rawContentType = response.headers.get("content-type");
	const contentType = rawContentType !== null ? rawContentType : undefined;

	return {
		result: isRedirected ? "redirected" : "valid",
		httpStatus: response.status,
		...(isRedirected ? { finalUrl } : {}),
		detectedPlatform,
		contentType,
	};
}

function isAbortError(error: unknown): boolean {
	return (
		error !== null &&
		typeof error === "object" &&
		"name" in error &&
		(error as { name: unknown }).name === "AbortError"
	);
}

// --- impit path for bot-protected platforms (e.g. Deliveroo) ---

type ImpitFetchOutcome =
	| { type: "response"; response: ImpitResponse }
	| { type: "abort" }
	| { type: "network" }
	| { type: "error" };

async function attemptImpitFetch(
	url: string,
	method: "HEAD" | "GET",
	timeoutMs: number,
): Promise<ImpitFetchOutcome> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await impitClient.fetch(url, {
			method,
			redirect: "follow",
			signal: controller.signal,
		});
		clearTimeout(timer);
		return { type: "response", response };
	} catch (error) {
		clearTimeout(timer);
		if (isAbortError(error)) return { type: "abort" };
		if (error instanceof TypeError) return { type: "network" };
		return { type: "error" };
	}
}

async function attemptImpitGet(
	url: string,
	timeoutMs: number,
): Promise<UrlCheckEvidence> {
	const outcome = await attemptImpitFetch(url, "GET", timeoutMs);

	if (outcome.type === "response") {
		if (outcome.response.ok) {
			return buildEvidence(outcome.response as unknown as Response, url);
		}
		if (BLOCKED_STATUSES.has(outcome.response.status)) {
			return {
				result: "not_verifiable",
				httpStatus: outcome.response.status,
				detectedPlatform: detectMenuPlatformFromUrl(url),
			};
		}
		return { result: "inaccessible", httpStatus: outcome.response.status };
	}

	if (outcome.type === "abort") return { result: "unknown" };
	if (outcome.type === "network") return { result: "inaccessible" };
	return { result: "unknown" };
}

async function checkUrlWithImpit(
	url: string,
	timeoutMs: number,
): Promise<UrlCheckEvidence> {
	const headOutcome = await attemptImpitFetch(url, "HEAD", timeoutMs);

	if (headOutcome.type === "response") {
		if (headOutcome.response.ok) {
			return buildEvidence(headOutcome.response as unknown as Response, url);
		}
		if (BLOCKED_STATUSES.has(headOutcome.response.status)) {
			return {
				result: "not_verifiable",
				httpStatus: headOutcome.response.status,
				detectedPlatform: detectMenuPlatformFromUrl(url),
			};
		}
		if (FALLBACK_TO_GET_STATUSES.has(headOutcome.response.status)) {
			return attemptImpitGet(url, timeoutMs);
		}
		return { result: "inaccessible", httpStatus: headOutcome.response.status };
	}

	if (headOutcome.type === "abort") return { result: "unknown" };
	if (headOutcome.type === "network") return { result: "inaccessible" };
	return { result: "unknown" };
}
