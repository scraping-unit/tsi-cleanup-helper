import type { MenuPlatform } from "./platform-detection.js";

const OWN_WEBSITE_BLOCKLIST = [
	"ubereats.com",
	"deliveroo.co.uk",
	"just-eat.co.uk",
	"facebook.com",
	"instagram.com",
	"tripadvisor.",
	"zomato.",
	"opentable.",
	"quandoo.",
	"menyoo.",
	"zmenu.",
	"hkpcl.com",
];

export function isLikelyPlatformDeepLink(
	url: string,
	platform: MenuPlatform,
): boolean | null {
	if (platform !== "UberEats" && platform !== "Deliveroo" && platform !== "JustEat") {
		return null;
	}

	const normalizedUrl = normalizeHttpUrl(url);
	if (normalizedUrl === null) return false;

	if (platform === "UberEats") {
		return /^https:\/\/www\.ubereats\.com\/gb\/store\/[^/]+\/[A-Za-z0-9_-]{10,}(?:\?.*)?$/.test(
			normalizedUrl,
		);
	}
	if (platform === "Deliveroo") {
		return /^https:\/\/deliveroo\.co\.uk\/menu\/[^/]+\/[^/]+\/\d+-[^?\s]+(?:\?.*)?$/.test(
			normalizedUrl,
		);
	}
	if (
		/^https:\/\/www\.just-eat\.co\.uk\/restaurants-new\//.test(normalizedUrl)
	) {
		return false;
	}
	return /^https:\/\/www\.just-eat\.co\.uk\/restaurants-[^/]+\/menu(?:\?.*)?$/.test(
		normalizedUrl,
	);
}

export function isBlockedOwnWebsiteCandidate(url: string): boolean {
	const normalizedUrl = normalizeHttpUrl(url);
	if (normalizedUrl === null) return true;

	const hostname = new URL(normalizedUrl).hostname.toLowerCase();
	return OWN_WEBSITE_BLOCKLIST.some((blockedDomain) =>
		hostname.includes(blockedDomain),
	);
}

function normalizeHttpUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
		return parsed.href;
	} catch {
		return null;
	}
}
