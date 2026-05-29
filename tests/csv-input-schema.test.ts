import { describe, expect, it } from "vitest";

import {
	CSV_OPTIONAL_COLUMNS,
	CSV_REQUIRED_COLUMNS,
	normalizeFailedMenuCsvRow,
	validateCsvHeaders,
} from "../src/csv/input-schema.js";

describe("CSV input schema", () => {
	const completeRow = {
		brand_id: " 101 ",
		brand_name: " Example Brand ",
		menu_id: " 202 ",
		menu_url: " https://example.com/menu ",
		scraping_status: " failed ",
		cluster_id: " cluster-1 ",
		template_name: " deliveroo ",
		menu_link: " https://internal/menu/202 ",
		brand_gateway_task_link: "",
		menu_definition_task_link: "",
		scraper: " scraper-a ",
		status: " Pending ",
		comment: " needs check ",
		menu_format: " html ",
	};

	it("defines the required and optional CSV columns", () => {
		expect(CSV_REQUIRED_COLUMNS).toEqual([
			"brand_id",
			"brand_name",
			"menu_id",
			"menu_url",
			"scraping_status",
			"cluster_id",
			"template_name",
		]);

		expect(CSV_OPTIONAL_COLUMNS).toEqual([
			"menu_link",
			"brand_gateway_task_link",
			"menu_definition_task_link",
			"scraper",
			"status",
			"comment",
			"menu_format",
		]);
	});

	it("accepts headers when all required columns are present", () => {
		const result = validateCsvHeaders([
			...CSV_REQUIRED_COLUMNS,
			"comment",
			"unknown_extra_column",
		]);

		expect(result).toEqual({ ok: true, missingColumns: [] });
	});

	it("reports missing required columns", () => {
		const result = validateCsvHeaders(["brand_id", "menu_id"]);

		expect(result).toEqual({
			ok: false,
			missingColumns: [
				"brand_name",
				"menu_url",
				"scraping_status",
				"cluster_id",
				"template_name",
			],
		});
	});

	it("normalizes a valid failed-menu row", () => {
		expect(normalizeFailedMenuCsvRow(completeRow)).toEqual({
			brandId: "101",
			brandName: "Example Brand",
			menuId: "202",
			menuUrl: "https://example.com/menu",
			scrapingStatus: "failed",
			clusterId: "cluster-1",
			templateName: "deliveroo",
			menuLink: "https://internal/menu/202",
			brandGatewayTaskLink: undefined,
			menuDefinitionTaskLink: undefined,
			scraper: "scraper-a",
			status: "Pending",
			comment: "needs check",
			menuFormat: "html",
		});
	});

	it("rejects rows with blank required values", () => {
		expect(() =>
			normalizeFailedMenuCsvRow({ ...completeRow, menu_url: " " }),
		).toThrow("Missing required CSV value: menu_url");
	});
});
