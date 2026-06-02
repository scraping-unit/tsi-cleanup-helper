import type { CsvRequiredColumn } from "./input-schema.js";
import { normalizeCsvHeader, normalizeFailedMenuCsvRow, validateCsvHeaders } from "./input-schema.js";
import type { CsvInputRow } from "./input-schema.js";
import { parseCsvString } from "./parser.js";
import type { NormalizedFailedMenuRecord } from "../domain/types.js";

export type CsvRowError = {
	rowNumber?: number;
	message: string;
};

export type CsvImportResult = {
	records: NormalizedFailedMenuRecord[];
	errors: CsvRowError[];
	missingRequiredColumns: CsvRequiredColumn[];
};

export function importCsvString(csv: string): CsvImportResult {
	const parsed = parseCsvString(csv);

	if (parsed.error !== undefined) {
		return { records: [], errors: [{ message: parsed.error }], missingRequiredColumns: [] };
	}

	if (parsed.headers.length === 0) {
		return { records: [], errors: [], missingRequiredColumns: [] };
	}

	const headerValidation = validateCsvHeaders(parsed.headers);
	if (!headerValidation.ok) {
		return {
			records: [],
			errors: [],
			missingRequiredColumns: headerValidation.missingColumns,
		};
	}

	const records: NormalizedFailedMenuRecord[] = [];
	const errors: CsvRowError[] = [];

	for (let i = 0; i < parsed.rows.length; i++) {
		const rowNumber = i + 2; // header = row 1, data starts at row 2
		const values = parsed.rows[i]!;

		const row: CsvInputRow = {};
		for (let j = 0; j < parsed.headers.length; j++) {
			const header = normalizeCsvHeader(parsed.headers[j]!);
			const value = values[j] ?? "";

			if (row[header]?.trim() && !value.trim()) continue;
			row[header] = value;
		}

		try {
			records.push(normalizeFailedMenuCsvRow(row));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			errors.push({ rowNumber, message });
		}
	}

	return { records, errors, missingRequiredColumns: [] };
}
