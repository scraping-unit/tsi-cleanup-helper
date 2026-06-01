import { describe, expect, it } from "vitest";

import {
	MENU_PLATFORMS,
	detectMenuPlatformFromUrl,
} from "../src/domain/platform-detection.js";

describe("platform detection", () => {
	it("exports the supported platform and source values", () => {
		expect(MENU_PLATFORMS).toEqual([
			"Deliveroo",
			"UberEats",
			"JustEat",
			"Foodhub",
			"Wix",
			"Grub24",
			"PDF",
			"Image",
			"OwnWebsite",
			"Unknown",
		]);
	});

	it.each([
		["https://deliveroo.co.uk/menu/example", "Deliveroo"],
		["https://www.ubereats.com/store/example", "UberEats"],
		["https://www.just-eat.co.uk/menu/example", "JustEat"],
		["https://foodhub.co.uk/menu/example", "Foodhub"],
		["https://example.wixsite.com/menu", "Wix"],
		["https://order.grub24.co.uk/menu/example", "Grub24"],
	])("detects %s as %s", (url, expected) => {
		expect(detectMenuPlatformFromUrl(url)).toBe(expected);
	});

	it("detects own website menus for unknown domains", () => {
		expect(
			detectMenuPlatformFromUrl("https://example-restaurant.com/menu"),
		).toBe("OwnWebsite");
	});

	it("detects PDF URLs", () => {
		expect(
			detectMenuPlatformFromUrl("https://example.com/menus/dinner.PDF"),
		).toBe("PDF");
	});

	it("detects image URLs", () => {
		expect(
			detectMenuPlatformFromUrl("https://example.com/menus/menu-image.JPG"),
		).toBe("Image");
	});

	it("returns unknown for empty and malformed URLs", () => {
		expect(detectMenuPlatformFromUrl("")).toBe("Unknown");
		expect(detectMenuPlatformFromUrl("   ")).toBe("Unknown");
		expect(detectMenuPlatformFromUrl("not a valid url")).toBe("Unknown");
		expect(detectMenuPlatformFromUrl("ftp://example.com/menu")).toBe(
			"Unknown",
		);
	});

	it("detects platform from bare hostname URLs (no scheme)", () => {
		expect(detectMenuPlatformFromUrl("deliveroo.co.uk/menu/example")).toBe(
			"Deliveroo",
		);
		expect(detectMenuPlatformFromUrl("ubereats.com/store/example")).toBe(
			"UberEats",
		);
	});

	it.each([
		"https://deliveroo.co.uk/menu/london/test",
		"https://www.deliveroo.co.uk/menu/manchester/test",
		"deliveroo.co.uk/menu/bristol/test",
	])("detects Deliveroo from %s", (url) => {
		expect(detectMenuPlatformFromUrl(url)).toBe("Deliveroo");
	});

	it("returns Unknown for relative URLs", () => {
		expect(detectMenuPlatformFromUrl("/menu/dinner.pdf")).toBe("Unknown");
	});

	it("detects JustEat from justeat.com (no-dash variant)", () => {
		expect(
			detectMenuPlatformFromUrl("https://www.justeat.com/menu/example"),
		).toBe("JustEat");
	});
});
