export type CsvParseResult = {
	headers: string[];
	rows: string[][];
	error?: string;
};

export function parseCsvString(csv: string): CsvParseResult {
	// Strip UTF-8 BOM
	const input = csv.startsWith("﻿") ? csv.slice(1) : csv;

	if (input.trim() === "") {
		return { headers: [], rows: [] };
	}

	const allRows: string[][] = [];
	let pos = 0;

	while (pos < input.length) {
		const result = parseRow(input, pos);
		if (result.error !== undefined) {
			return { headers: [], rows: [], error: result.error };
		}
		allRows.push(result.row);
		pos = result.next;
	}

	// Drop trailing empty rows (common from Excel exports)
	while (allRows.length > 0 && allRows[allRows.length - 1]!.every((v) => v === "")) {
		allRows.pop();
	}

	if (allRows.length === 0) {
		return { headers: [], rows: [] };
	}

	const [headers, ...rows] = allRows as [string[], ...string[][]];
	return { headers, rows };
}

type RowResult =
	| { row: string[]; next: number; error?: undefined }
	| { row: string[]; next: number; error: string };

function parseRow(input: string, start: number): RowResult {
	const fields: string[] = [];
	let pos = start;

	while (true) {
		if (pos < input.length && input[pos] === '"') {
			// Quoted field — scan until closing quote, allowing embedded newlines
			pos++; // skip opening quote
			let field = "";
			let closed = false;

			while (pos < input.length) {
				if (input[pos] === '"') {
					if (pos + 1 < input.length && input[pos + 1] === '"') {
						field += '"';
						pos += 2;
					} else {
						pos++; // skip closing quote
						closed = true;
						break;
					}
				} else {
					field += input[pos]!;
					pos++;
				}
			}

			if (!closed) {
				return { row: fields, next: pos, error: "Malformed CSV: unclosed quoted field" };
			}

			fields.push(field);
		} else {
			// Unquoted field — read until delimiter or EOL
			let field = "";
			while (pos < input.length && input[pos] !== "," && input[pos] !== "\r" && input[pos] !== "\n") {
				field += input[pos]!;
				pos++;
			}
			fields.push(field);
		}

		if (pos >= input.length) {
			break;
		}

		if (input[pos] === ",") {
			pos++;
			// Trailing comma = one more empty field, then end of row
			if (pos >= input.length || input[pos] === "\r" || input[pos] === "\n") {
				fields.push("");
				break;
			}
			// else continue to next field
		} else {
			// EOL — stop collecting fields for this row
			break;
		}
	}

	// Advance past EOL characters
	if (pos < input.length) {
		if (input[pos] === "\r" && pos + 1 < input.length && input[pos + 1] === "\n") {
			pos += 2;
		} else if (input[pos] === "\r" || input[pos] === "\n") {
			pos += 1;
		}
	}

	return { row: fields, next: pos };
}
