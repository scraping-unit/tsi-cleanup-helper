import { describe, expect, it } from "vitest";

import {
	isBlockedOwnWebsiteCandidate,
	isLikelyPlatformDeepLink,
} from "../src/domain/platform-url-rules.js";

describe("isLikelyPlatformDeepLink", () => {
	it("recognizes UberEats restaurant links with terminal IDs", () => {
		expect(
			isLikelyPlatformDeepLink(
				"https://www.ubereats.com/gb/store/example/abcdefghij?diningMode=DELIVERY",
				"UberEats",
			),
		).toBe(true);
	});

	it("recognizes Deliveroo links with numeric restaurant IDs", () => {
		expect(
			isLikelyPlatformDeepLink(
				"https://deliveroo.co.uk/menu/manchester/centre/123-example",
				"Deliveroo",
			),
		).toBe(true);
	});

	it("rejects JustEat listing links", () => {
		expect(
			isLikelyPlatformDeepLink(
				"https://www.just-eat.co.uk/restaurants-new/manchester",
				"JustEat",
			),
		).toBe(false);
	});

	it("returns null when no deep-link rule applies", () => {
		expect(isLikelyPlatformDeepLink("https://example.com/menu", "OwnWebsite")).toBe(
			null,
		);
	});
});

describe("isBlockedOwnWebsiteCandidate", () => {
	it("blocks delivery and directory domains", () => {
		expect(isBlockedOwnWebsiteCandidate("https://deliveroo.co.uk/menu/test")).toBe(
			true,
		);
		expect(isBlockedOwnWebsiteCandidate("https://restaurant.tripadvisor.co.uk")).toBe(
			true,
		);
	});

	it("allows a restaurant-owned domain", () => {
		expect(isBlockedOwnWebsiteCandidate("https://example-pizza.co.uk/menu")).toBe(
			false,
		);
	});
});
