import { describe, expect, it, vi } from "vitest";

import {
	applyAiReviewResult,
	extractOutputText,
	extractWebSearchSourceUrls,
	reviewFailedMenuWithAi,
	shouldReviewRowWithAi,
} from "../src/domain/ai-review.js";
import type { AiReviewResult } from "../src/domain/ai-review.js";
import type { ProcessedOutputRow } from "../src/domain/types.js";

const BASE_ROW: ProcessedOutputRow = {
	menuId: "menu-1",
	brandId: "brand-1",
	brandName: "Acme Pizza",
	clusterId: "cluster-1",
	templateName: "deliveroo",
	currentMenuUrl: "https://example.com/menu",
	scrapingStatus: "failed",
	currentUrlResult: "unknown",
	menuContentDetected: false,
	brandMatch: "unknown",
	recommendedStatus: "Other",
	confidence: "low",
	recommendationReason: "manual_review_required",
	needsEscalation: true,
};

const AI_RESULT: AiReviewResult = {
	action: "update_url",
	urlStillAccessible: false,
	menuStillAvailable: true,
	candidateUrl: "https://example.com/menu/new",
	targetClusterHint: null,
	confidence: "medium",
	confidencePercentage: 72,
	reason: "Replacement menu found.",
	evidenceUrls: ["https://example.com/menu/new"],
};

describe("reviewFailedMenuWithAi", () => {
	it("uses Responses API web search with structured output", async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					output: [
						{
							type: "web_search_call",
							action: {
								sources: [
									{ url: "https://search.example/source" },
									{ url: "https://search.example/source" },
								],
							},
						},
						{ type: "message", content: [{ type: "output_text", text: JSON.stringify(AI_RESULT) }] },
					],
				}),
				{ status: 200 },
			),
		);

		await expect(
			reviewFailedMenuWithAi(BASE_ROW, { apiKey: "test-key", fetchFn }),
		).resolves.toEqual({
			...AI_RESULT,
			evidenceUrls: ["https://search.example/source"],
		});

		const [, init] = fetchFn.mock.calls[0]!;
		const body = JSON.parse(String(init.body));
		expect(body.model).toBe("gpt-5.5");
		expect(body.reasoning).toEqual({ effort: "low" });
		expect(body.tools).toEqual([
			{
				type: "web_search",
				search_context_size: "low",
				user_location: { type: "approximate", country: "GB" },
			},
		]);
		expect(body.max_tool_calls).toBe(2);
		expect(body.store).toBe(false);
		expect(body.include).toEqual(["web_search_call.action.sources"]);
		expect(body.text.verbosity).toBe("low");
		expect(body.text.format.type).toBe("json_schema");
		expect(init.headers.Authorization).toBe("Bearer test-key");
	});

	it("throws API errors without exposing the API key", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(new Response("billing required", { status: 429 }));
		await expect(
			reviewFailedMenuWithAi(BASE_ROW, { apiKey: "secret", fetchFn }),
		).rejects.toThrow("OpenAI API 429: billing required");
	});
});

describe("AI review row helpers", () => {
	it("selects unresolved rows and skips reviewed rows", () => {
		expect(shouldReviewRowWithAi(BASE_ROW)).toBe(true);
		expect(shouldReviewRowWithAi({ ...BASE_ROW, aiReviewStatus: "reviewed" })).toBe(
			false,
		);
	});

	it("applies advisory output to the row", () => {
		const row = { ...BASE_ROW };
		applyAiReviewResult(row, AI_RESULT);
		expect(row.aiReviewStatus).toBe("reviewed");
		expect(row.aiRecommendedAction).toBe("update_url");
		expect(row.aiConfidencePercentage).toBe(72);
		expect(row.aiUrlStillAccessible).toBe(false);
		expect(row.aiMenuStillAvailable).toBe(true);
		expect(row.aiCandidateUrl).toBe("https://example.com/menu/new");
	});

	it("extracts top-level output_text when present", () => {
		expect(extractOutputText({ output_text: "hello" })).toBe("hello");
	});

	it("extracts unique web search source URLs", () => {
		expect(
			extractWebSearchSourceUrls({
				output: [
					{ type: "web_search_call", action: { sources: [{ url: "https://example.com/a" }] } },
					{ type: "web_search_call", action: { sources: [{ url: "https://example.com/a" }, { url: "https://example.com/b" }] } },
				],
			}),
		).toEqual(["https://example.com/a", "https://example.com/b"]);
	});
});
