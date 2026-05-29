import { describe, expect, it } from "vitest";

import { parseCsvString } from "../src/csv/parser.js";

describe("parseCsvString", () => {
	it("returns empty result for empty string", () => {
		expect(parseCsvString("")).toEqual({ headers: [], rows: [] });
	});

	it("returns empty result for whitespace-only string", () => {
		expect(parseCsvString("   \n  ")).toEqual({ headers: [], rows: [] });
	});

	it("returns empty result for header-only CSV", () => {
		expect(parseCsvString("brand_id,brand_name\n")).toEqual({
			headers: ["brand_id", "brand_name"],
			rows: [],
		});
	});

	it("parses a plain CSV with one data row", () => {
		const csv = "brand_id,brand_name\n101,Acme\n";
		expect(parseCsvString(csv)).toEqual({
			headers: ["brand_id", "brand_name"],
			rows: [["101", "Acme"]],
		});
	});

	it("parses multiple data rows", () => {
		const csv = "a,b\n1,2\n3,4\n";
		expect(parseCsvString(csv)).toEqual({
			headers: ["a", "b"],
			rows: [
				["1", "2"],
				["3", "4"],
			],
		});
	});

	it("handles CRLF line endings", () => {
		const csv = "a,b\r\n1,2\r\n3,4\r\n";
		expect(parseCsvString(csv)).toEqual({
			headers: ["a", "b"],
			rows: [
				["1", "2"],
				["3", "4"],
			],
		});
	});

	it("parses quoted fields containing commas", () => {
		const csv = 'name,address\n"Smith, John","123 Main St"\n';
		expect(parseCsvString(csv)).toEqual({
			headers: ["name", "address"],
			rows: [["Smith, John", "123 Main St"]],
		});
	});

	it("parses escaped double-quotes inside quoted fields", () => {
		const csv = 'comment\n"say ""hello"""\n';
		expect(parseCsvString(csv)).toEqual({
			headers: ["comment"],
			rows: [['say "hello"']],
		});
	});

	it("parses quoted field with embedded newline", () => {
		const csv = 'comment\n"line one\nline two"\n';
		expect(parseCsvString(csv)).toEqual({
			headers: ["comment"],
			rows: [["line one\nline two"]],
		});
	});

	it("strips UTF-8 BOM", () => {
		const csv = "﻿brand_id,brand_name\n101,Acme\n";
		expect(parseCsvString(csv)).toEqual({
			headers: ["brand_id", "brand_name"],
			rows: [["101", "Acme"]],
		});
	});

	it("drops trailing empty rows", () => {
		const csv = "a,b\n1,2\n\n\n";
		expect(parseCsvString(csv)).toEqual({
			headers: ["a", "b"],
			rows: [["1", "2"]],
		});
	});

	it("returns error for unclosed quoted field", () => {
		const csv = 'name\n"unclosed\n';
		const result = parseCsvString(csv);
		expect(result.error).toMatch(/unclosed quoted field/i);
		expect(result.headers).toEqual([]);
		expect(result.rows).toEqual([]);
	});
});
