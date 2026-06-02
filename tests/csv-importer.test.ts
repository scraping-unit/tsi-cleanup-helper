import { describe, expect, it } from "vitest";

import { importCsvString } from "../src/csv/importer.js";

const REQUIRED_HEADERS = "brand_id,brand_name,menu_id,menu_url,scraping_status,cluster_id,template_name";

const VALID_ROW = "101,Acme,202,https://example.com/menu,failed,cluster-1,deliveroo";

describe("importCsvString", () => {
	it("returns empty result for empty string", () => {
		expect(importCsvString("")).toEqual({
			records: [],
			errors: [],
			missingRequiredColumns: [],
		});
	});

	it("returns empty result for header-only CSV", () => {
		const result = importCsvString(`${REQUIRED_HEADERS}\n`);
		expect(result).toEqual({
			records: [],
			errors: [],
			missingRequiredColumns: [],
		});
	});

	it("parses a valid CSV into normalized records", () => {
		const csv = `${REQUIRED_HEADERS}\n${VALID_ROW}\n`;
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
		expect(result.missingRequiredColumns).toEqual([]);
		expect(result.records[0]).toEqual({
			brandId: "101",
			brandName: "Acme",
			menuId: "202",
			menuUrl: "https://example.com/menu",
			scrapingStatus: "failed",
			clusterId: "cluster-1",
			templateName: "deliveroo",
			menuLink: undefined,
			brandGatewayTaskLink: undefined,
			menuDefinitionTaskLink: undefined,
			scraper: undefined,
			status: undefined,
			comment: undefined,
			menuFormat: undefined,
		});
	});

	it("reports missing required columns without processing rows", () => {
		const csv = "brand_id,menu_id\n101,202\n";
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
		expect(result.missingRequiredColumns).toEqual(
			expect.arrayContaining(["brand_name", "menu_url", "scraping_status", "cluster_id", "template_name"]),
		);
	});

	it("collects row error with correct row number for blank required field", () => {
		const badRow = "101,Acme,202,,failed,cluster-1,deliveroo"; // menu_url is blank
		const csv = `${REQUIRED_HEADERS}\n${VALID_ROW}\n${badRow}\n`;
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toMatchObject({
			rowNumber: 3, // header=1, first data=2, second data=3
			message: expect.stringContaining("menu_url"),
		});
	});

	it("ignores extra unknown columns", () => {
		const csv = `${REQUIRED_HEADERS},unknown_col\n${VALID_ROW},extra_value\n`;
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
	});

	it("preserves optional columns when present", () => {
		const csv =
			`${REQUIRED_HEADERS},menu_link,scraper,comment,menu_format\n` +
			`${VALID_ROW},https://link.example,scraper-a,needs check,html\n`;
		const result = importCsvString(csv);

		expect(result.records[0]).toMatchObject({
			menuLink: "https://link.example",
			scraper: "scraper-a",
			comment: "needs check",
			menuFormat: "html",
		});
	});

	it("imports real sheet headers and keeps the non-empty scraping status alias", () => {
		const csv =
			"Brand Id,Brand Name,Brand Gateway Task Link,Menu Id,Menu Link,Menu Url,Menu Scraping Status,scraping_status,cluster_id,template_name,Definer,Status,Comment\n" +
			"101,Acme,https://gateway.example,202,https://link.example,https://example.com/menu,WEBSITE_NOT_FOUND,,cluster-1,deliveroo,scraper-a,Pending,needs check\n";
		const result = importCsvString(csv);

		expect(result.errors).toEqual([]);
		expect(result.missingRequiredColumns).toEqual([]);
		expect(result.records[0]).toMatchObject({
			brandId: "101",
			brandName: "Acme",
			menuId: "202",
			menuUrl: "https://example.com/menu",
			scrapingStatus: "WEBSITE_NOT_FOUND",
			clusterId: "cluster-1",
			templateName: "deliveroo",
			menuLink: "https://link.example",
			brandGatewayTaskLink: "https://gateway.example",
			scraper: "scraper-a",
			status: "Pending",
			comment: "needs check",
		});
	});

	it("optional columns absent → undefined in record", () => {
		const csv = `${REQUIRED_HEADERS}\n${VALID_ROW}\n`;
		const result = importCsvString(csv);

		const rec = result.records[0]!;
		expect(rec.menuLink).toBeUndefined();
		expect(rec.scraper).toBeUndefined();
		expect(rec.comment).toBeUndefined();
	});

	it("returns structured error for malformed CSV without crashing", () => {
		const csv = `${REQUIRED_HEADERS}\n"unclosed\n`;
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(0);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toMatch(/unclosed quoted field/i);
		expect(result.errors[0]!.rowNumber).toBeUndefined();
		expect(result.missingRequiredColumns).toEqual([]);
	});

	it("processes multiple rows and collects all errors independently", () => {
		const blankBrandName = "101,,202,https://example.com/menu,failed,cluster-1,deliveroo";
		const blankMenuUrl = "101,Acme,202,,failed,cluster-1,deliveroo";
		const csv = `${REQUIRED_HEADERS}\n${VALID_ROW}\n${blankBrandName}\n${blankMenuUrl}\n`;
		const result = importCsvString(csv);

		expect(result.records).toHaveLength(1);
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0]!.rowNumber).toBe(3);
		expect(result.errors[1]!.rowNumber).toBe(4);
	});
});
