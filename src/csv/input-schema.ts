import type { NormalizedFailedMenuRecord } from "../domain/types.js";

export const CSV_REQUIRED_COLUMNS = [
	"brand_id",
	"brand_name",
	"menu_id",
	"menu_url",
	"scraping_status",
	"cluster_id",
	"template_name",
] as const;

export const CSV_OPTIONAL_COLUMNS = [
	"menu_link",
	"brand_gateway_task_link",
	"menu_definition_task_link",
	"scraper",
	"status",
	"comment",
	"menu_format",
] as const;

export type CsvRequiredColumn = (typeof CSV_REQUIRED_COLUMNS)[number];
export type CsvOptionalColumn = (typeof CSV_OPTIONAL_COLUMNS)[number];
export type CsvInputColumn = CsvRequiredColumn | CsvOptionalColumn;

export type CsvInputRow = Partial<Record<CsvInputColumn, string>> &
	Record<string, string | undefined>;

export type CsvHeaderValidationResult = {
	ok: boolean;
	missingColumns: CsvRequiredColumn[];
};

export function validateCsvHeaders(
	headers: readonly string[],
): CsvHeaderValidationResult {
	const headerSet = new Set(headers);
	const missingColumns = CSV_REQUIRED_COLUMNS.filter(
		(column) => !headerSet.has(column),
	);

	return {
		ok: missingColumns.length === 0,
		missingColumns,
	};
}

export function normalizeFailedMenuCsvRow(
	row: CsvInputRow,
): NormalizedFailedMenuRecord {
	return {
		brandId: requiredValue(row, "brand_id"),
		brandName: requiredValue(row, "brand_name"),
		menuId: requiredValue(row, "menu_id"),
		menuUrl: requiredValue(row, "menu_url"),
		scrapingStatus: requiredValue(row, "scraping_status"),
		clusterId: requiredValue(row, "cluster_id"),
		templateName: requiredValue(row, "template_name"),
		menuLink: optionalValue(row.menu_link),
		brandGatewayTaskLink: optionalValue(row.brand_gateway_task_link),
		menuDefinitionTaskLink: optionalValue(row.menu_definition_task_link),
		scraper: optionalValue(row.scraper),
		status: optionalValue(row.status),
		comment: optionalValue(row.comment),
		menuFormat: optionalValue(row.menu_format),
	};
}

function requiredValue(row: CsvInputRow, column: CsvRequiredColumn): string {
	const value = row[column]?.trim();
	if (!value) {
		throw new Error(`Missing required CSV value: ${column}`);
	}

	return value;
}

function optionalValue(value: string | undefined): string | undefined {
	const normalized = value?.trim();
	return normalized ? normalized : undefined;
}
