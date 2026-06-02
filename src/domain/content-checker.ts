import type { MenuPlatform } from "./platform-detection.js";
import type { ContentSignal } from "./types.js";

const UBEREATS_CLOSED_RE = /closed on uber eats/i;
const UBEREATS_NOTHING_HERE_RE = /nothing to eat here/i;

export function checkContentSignal(body: string, platform: MenuPlatform): ContentSignal {
	if (platform === "UberEats") {
		const title = extractHtmlTitle(body);
		const visibleText = extractVisibleText(body);
		return UBEREATS_NOTHING_HERE_RE.test(title) ||
			UBEREATS_CLOSED_RE.test(visibleText)
			? "closed"
			: "unknown";
	}
	return "unknown";
}

export function extractHtmlTitle(html: string): string {
	return html
		.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
		?.replace(/\s+/g, " ")
		.trim() ?? "";
}

export function extractVisibleText(html: string): string {
	const bodyHtml = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
	return bodyHtml
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
