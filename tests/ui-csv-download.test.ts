// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../ui/node_modules/@types/node/index.d.ts" />
/* global Buffer, fetch, process, setTimeout */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, expect as playwrightExpect, type Browser } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const UI_PORT = 5187;
const UI_URL = `http://127.0.0.1:${UI_PORT}/`;
const CSV_TEXT =
	"menu_id,brand_id,brand_name,cluster_id,template_name,menu_url,scraping_status,menu_link,brand_gateway_task_link,menu_definition_task_link,scraper,status,comment,menu_format,current_url_result,http_status,final_url,detected_platform,deliveroo_verified,content_type,format_detected,menu_content_detected,brand_match,candidate_new_url,candidate_source,recommended_status,confidence,recommendation_reason,human_final_status,human_comment,needs_escalation,escalation_reason,ai_review_status,ai_recommended_action,ai_confidence,ai_confidence_percentage,ai_url_still_accessible,ai_menu_still_available,ai_reason,ai_candidate_url,ai_target_cluster_hint,ai_evidence_urls,ai_error,processing_error\r\n" +
	"202,101,Acme,cluster-1,justeat,https://www.just-eat.co.uk/restaurants-acme/menu,failed,,,,,,,justeat,not_verifiable,403,,justeat,,,,false,unknown,,,Pending,low,Current URL could not be verified,,,true,Manual review required,,,,,,,,,,,,";

describe("CSV download", () => {
	let vite: ChildProcessWithoutNullStreams;
	let browser: Browser;

	beforeAll(async () => {
		vite = spawn(
			process.execPath,
			[
				"node_modules/vite/bin/vite.js",
				"--host",
				"127.0.0.1",
				"--port",
				String(UI_PORT),
				"--strictPort",
			],
			{ cwd: "ui" },
		);

		await waitForUrl(UI_URL);
		browser = await chromium.launch({ headless: true });
	}, 30_000);

	afterAll(async () => {
		await browser?.close();
		vite?.kill();
	});

	it("keeps the generated CSV blob URL valid in React StrictMode", async () => {
		const page = await browser.newPage({ acceptDownloads: true });
		await page.route("**/api/process**", async (route) => {
			const isCreateRequest =
				route.request().method() === "POST" &&
				new URL(route.request().url()).pathname === "/api/process";
			await route.fulfill({
				status: isCreateRequest ? 202 : 200,
				contentType: "application/json",
				body: JSON.stringify(
					isCreateRequest
						? { jobId: "job-1" }
						: { status: "complete", data: buildJustEatApiResponse() },
				),
			});
		});

		await page.goto(UI_URL);
		await page.locator('input[type="file"]').setInputFiles({
			name: "justeat.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(
				"brand_id,brand_name,menu_id,menu_url,scraping_status,cluster_id,template_name\n" +
					"101,Acme,202,https://www.just-eat.co.uk/restaurants-acme/menu,failed,cluster-1,justeat\n",
			),
		});
		await page.getByText("Download CSV").waitFor();
		await page.getByText("AI review unresolved").waitFor();

		const href = await page
			.locator('a[download="tsi-cleanup-export.csv"]')
			.getAttribute("href");
		expect(href).toMatch(/^blob:/);

		const response = await page.evaluate(async (url) => {
			if (url === null) return { ok: false, status: 0, text: "" };
			const res = await fetch(url);
			return { ok: res.ok, status: res.status, text: await res.text() };
		}, href);
		expect(response).toMatchObject({ ok: true, status: 200 });
		expect(response.text).toBe(CSV_TEXT);

		const [download] = await Promise.all([
			page.waitForEvent("download"),
			page.locator('a[download="tsi-cleanup-export.csv"]').click(),
		]);
		expect(await download.failure()).toBeNull();
		expect(download.suggestedFilename()).toBe("tsi-cleanup-export.csv");

		await page.reload();
		await page.getByText("Download CSV").waitFor();

		await page.close();
	}, 20_000);

	it("runs AI review only for selected eligible rows and keeps bulk review unchanged", async () => {
		const page = await browser.newPage();
		const aiReviewRequests: unknown[] = [];

		await page.route("**/api/process**", async (route) => {
			const request = route.request();
			const pathname = new URL(request.url()).pathname;
			if (request.method() === "POST" && pathname === "/api/process") {
				await route.fulfill({
					status: 202,
					contentType: "application/json",
					body: JSON.stringify({ jobId: "job-selection" }),
				});
				return;
			}
			if (request.method() === "POST" && pathname === "/api/process/job-selection/ai-review") {
				aiReviewRequests.push(request.postDataJSON());
				await route.fulfill({
					status: 202,
					contentType: "application/json",
					body: JSON.stringify({
						status: "complete",
						progress: { status: "complete", completed: 0, total: 0, updated: 0, errors: 0 },
					}),
				});
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ status: "complete", data: buildSelectionApiResponse() }),
			});
		});

		await page.goto(UI_URL);
		await page.locator('input[type="file"]').setInputFiles({
			name: "selection.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(
				"brand_id,brand_name,menu_id,menu_url,scraping_status,cluster_id,template_name\n" +
					"101,Acme,202,https://example.com/a,failed,cluster-1,justeat\n",
			),
		});
		await page.getByText("Download CSV").waitFor();

		await page.getByLabel("Select row 203").check();
		await playwrightExpect(page.getByRole("button", { name: "AI review selected (0)" })).toBeDisabled();
		await page.getByLabel("Select row 203").uncheck();
		await page.getByLabel("Select row 202").check();
		await page.getByLabel("Select row 204").check();
		await page.getByRole("button", { name: "AI review selected (2)" }).click();

		expect(aiReviewRequests[0]).toEqual({ rowIndexes: [0, 2] });

		await page.getByRole("button", { name: "AI review unresolved" }).click();
		expect(aiReviewRequests[1]).toEqual({ limit: 10 });

		await page.close();
	}, 20_000);
});

async function waitForUrl(url: string): Promise<void> {
	const deadline = Date.now() + 20_000;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch (error) {
			lastError = error;
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

function buildJustEatApiResponse() {
	return {
		result: {
			results: [
				{
					ok: true,
					row: {
						menuId: "202",
						brandId: "101",
						brandName: "Acme",
						clusterId: "cluster-1",
						templateName: "justeat",
						currentMenuUrl:
							"https://www.just-eat.co.uk/restaurants-acme/menu",
						scrapingStatus: "failed",
						currentUrlResult: "not_verifiable",
						httpStatus: 403,
						detectedPlatform: "justeat",
						menuContentDetected: false,
						brandMatch: "unknown",
						recommendedStatus: "Pending",
						confidence: "low",
						recommendationReason: "Current URL could not be verified",
						needsEscalation: true,
						escalationReason: "Manual review required",
					},
				},
			],
			summary: {
				total: 1,
				processed: 1,
				errors: 0,
				byStatus: {
					Pending: 1,
					"URL Updated": 0,
					"No need to update - Still valid": 0,
					Excluded: 0,
					"Format updated": 0,
					"Moved to another brand": 0,
					Other: 0,
				},
				byConfidence: { low: 1, medium: 0, high: 0 },
			},
		},
		csv: CSV_TEXT,
		importErrors: [],
	};
}

function buildSelectionApiResponse() {
	return {
		result: {
			results: [
				{
					ok: true,
					row: {
						menuId: "202",
						brandId: "101",
						brandName: "Acme",
						clusterId: "cluster-1",
						templateName: "justeat",
						currentMenuUrl: "https://example.com/a",
						scrapingStatus: "failed",
						currentUrlResult: "not_verifiable",
						httpStatus: 403,
						detectedPlatform: "justeat",
						menuContentDetected: false,
						brandMatch: "unknown",
						recommendedStatus: "Pending",
						confidence: "low",
						recommendationReason: "Current URL could not be verified",
						needsEscalation: true,
						escalationReason: "Manual review required",
					},
				},
				{
					ok: true,
					row: {
						menuId: "203",
						brandId: "101",
						brandName: "Acme",
						clusterId: "cluster-1",
						templateName: "ubereats",
						currentMenuUrl: "https://example.com/b",
						scrapingStatus: "failed",
						currentUrlResult: "valid",
						httpStatus: 200,
						detectedPlatform: "ubereats",
						menuContentDetected: true,
						brandMatch: true,
						recommendedStatus: "No need to update - Still valid",
						confidence: "high",
						recommendationReason: "Current URL is valid",
						needsEscalation: false,
					},
				},
				{
					ok: true,
					row: {
						menuId: "204",
						brandId: "101",
						brandName: "Acme",
						clusterId: "cluster-1",
						templateName: "deliveroo",
						currentMenuUrl: "https://example.com/c",
						scrapingStatus: "failed",
						currentUrlResult: "blocked",
						httpStatus: 403,
						detectedPlatform: "deliveroo",
						menuContentDetected: false,
						brandMatch: "unknown",
						recommendedStatus: "Other",
						confidence: "low",
						recommendationReason: "Manual review required",
						needsEscalation: true,
						escalationReason: "Manual review required",
					},
				},
			],
			summary: {
				total: 3,
				processed: 3,
				errors: 0,
				byStatus: {
					Pending: 1,
					"URL Updated": 0,
					"No need to update - Still valid": 1,
					Excluded: 0,
					"Format updated": 0,
					"Moved to another brand": 0,
					Other: 1,
				},
				byConfidence: { low: 2, medium: 0, high: 1 },
			},
		},
		csv: CSV_TEXT,
		importErrors: [],
	};
}
