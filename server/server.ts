import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { exportBatchResultsToCsv } from "../src/csv/exporter.js";
import { importCsvString } from "../src/csv/importer.js";
import { processBatch } from "../src/domain/batch-processor.js";
import { checkUrl } from "../src/domain/url-checker.js";

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:5173" }));

app.post("/api/process", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body["file"];

		if (!file || !(file instanceof File)) {
			return c.json({ error: "missing_file" }, 400);
		}

		const csvText = await file.text();
		const importResult = importCsvString(csvText);

		if (importResult.missingRequiredColumns.length > 0) {
			return c.json(
				{ error: "missing_columns", columns: importResult.missingRequiredColumns },
				400,
			);
		}

		if (importResult.errors.length > 0 && importResult.records.length === 0) {
			return c.json(
				{ error: "parse_error", details: importResult.errors },
				400,
			);
		}

		const batchResult = await processBatch(importResult.records, checkUrl);
		const csv = exportBatchResultsToCsv(batchResult.results);

		return c.json({
			result: batchResult,
			csv,
			importErrors: importResult.errors,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: "internal_error", message }, 500);
	}
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
	console.log(`Server running at http://localhost:${info.port}`);
});
