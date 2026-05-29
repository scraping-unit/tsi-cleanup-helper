import type { MenuPlatform } from "./platform-detection.js";
import type { ContentSignal } from "./types.js";

const UBEREATS_CLOSED_RE = /closed on uber eats/i;

export function checkContentSignal(body: string, platform: MenuPlatform): ContentSignal {
	if (platform === "UberEats") {
		return UBEREATS_CLOSED_RE.test(body) ? "closed" : "unknown";
	}
	return "unknown";
}
