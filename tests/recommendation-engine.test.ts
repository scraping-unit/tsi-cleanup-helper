import { describe, expect, it } from "vitest";

import { recommendCleanupStatus } from "../src/domain/recommendation-engine.js";
import { CONFIDENCE_VALUES, type FailedMenuEvidence } from "../src/domain/types.js";

describe("recommendCleanupStatus", () => {
	const validCurrentUrlEvidence: FailedMenuEvidence = {
		checkState: "checked",
		currentUrl: {
			result: "valid",
			httpStatus: 200,
			finalUrl: "https://example.com/menu",
		},
		menuContentDetected: true,
		brandMatch: true,
		format: {
			stored: "html",
			detected: "html",
			mismatch: false,
		},
	};

	it("exports the supported confidence values", () => {
		expect(CONFIDENCE_VALUES).toEqual(["low", "medium", "high"]);
	});

	it("keeps unchecked rows pending", () => {
		expect(
			recommendCleanupStatus({
				checkState: "not_checked",
				currentUrl: { result: "not_checked" },
			}),
		).toEqual({
			recommended_status: "Pending",
			confidence: "low",
			recommendation_reason: "not_checked",
			needs_escalation: false,
		});
	});

	it("recommends no update when the current URL is valid and matches the brand", () => {
		expect(recommendCleanupStatus(validCurrentUrlEvidence)).toEqual({
			recommended_status: "No need to update - Still valid",
			confidence: "high",
			recommendation_reason: "current_url_valid",
			needs_escalation: false,
		});
	});

	it("recommends format updated when a valid same URL has a format mismatch", () => {
		expect(
			recommendCleanupStatus({
				...validCurrentUrlEvidence,
				format: {
					stored: "pdf",
					detected: "html",
					mismatch: true,
				},
			}),
		).toMatchObject({
			recommended_status: "Format updated",
			confidence: "medium",
			recommendation_reason: "format_mismatch_detected",
			needs_escalation: false,
		});
	});

	it("recommends URL updated when the current URL is unusable and a candidate exists", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "inaccessible", httpStatus: 404 },
				candidateUrl: {
					url: "https://deliveroo.example/menu",
					source: "Deliveroo",
					result: "valid",
				},
			}),
		).toMatchObject({
			recommended_status: "URL Updated",
			confidence: "medium",
			recommendation_reason: "candidate_url_found",
			needs_escalation: false,
		});
	});

	it("recommends excluded only when current URL is unusable and no candidate exists", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "invalid" },
			}),
		).toMatchObject({
			recommended_status: "Excluded",
			confidence: "low",
			recommendation_reason: "current_url_unusable_no_candidate",
			needs_escalation: false,
		});
	});

	it("recommends moved to another brand when evidence indicates another brand", () => {
		expect(
			recommendCleanupStatus({
				...validCurrentUrlEvidence,
				brandMatch: false,
				otherExistingBrandMatch: {
					brandId: "brand-2",
					brandName: "Other Brand",
				},
			}),
		).toMatchObject({
			recommended_status: "Moved to another brand",
			confidence: "low",
			recommendation_reason: "belongs_to_another_brand",
			needs_escalation: true,
			escalation_reason:
				"Human confirmation required before moving a menu to another brand.",
		});
	});

	it("keeps a valid URL as still valid when scraping still failed and flags escalation", () => {
		expect(
			recommendCleanupStatus({
				...validCurrentUrlEvidence,
				scrapeStillFailed: true,
			}),
		).toEqual({
			recommended_status: "No need to update - Still valid",
			confidence: "medium",
			recommendation_reason: "valid_but_scrape_failed_escalate_to_vilius",
			needs_escalation: true,
			escalation_reason:
				"Current URL appears valid, but scraping still failed.",
		});
	});

	it("recommends Other with escalation when URL is blocked", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "blocked", httpStatus: 403 },
			}),
		).toMatchObject({
			recommended_status: "Other",
			confidence: "low",
			recommendation_reason: "url_blocked_manual_review_required",
			needs_escalation: true,
			escalation_reason:
				"URL returned 403/429 — may be bot protection, manual verification needed",
		});
	});

	it("uses other for unclear checked evidence", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "valid", httpStatus: 200 },
				menuContentDetected: false,
				brandMatch: true,
			}),
		).toMatchObject({
			recommended_status: "Other",
			confidence: "low",
			recommendation_reason: "manual_review_required",
			needs_escalation: true,
			escalation_reason: "Evidence is incomplete or conflicting.",
		});
	});

	it("recommends Excluded with high confidence when platform confirms closed", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "valid", httpStatus: 200, contentSignal: "closed" },
			}),
		).toEqual({
			recommended_status: "Excluded",
			confidence: "high",
			recommendation_reason: "platform_confirmed_closed",
			needs_escalation: false,
		});
	});

	it("treats contentSignal active as normal valid URL logic", () => {
		expect(
			recommendCleanupStatus({
				...validCurrentUrlEvidence,
				currentUrl: { ...validCurrentUrlEvidence.currentUrl, contentSignal: "active" },
			}),
		).toMatchObject({
			recommended_status: "No need to update - Still valid",
			confidence: "high",
		});
	});

	it("treats contentSignal unknown as normal valid URL logic", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "valid", httpStatus: 200, contentSignal: "unknown" },
				menuContentDetected: false,
			}),
		).toMatchObject({
			recommended_status: "Other",
			confidence: "low",
			needs_escalation: true,
		});
	});

	it("recommends Other with escalation when URL is not_verifiable", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "not_verifiable", httpStatus: 403 },
			}),
		).toEqual({
			recommended_status: "Other",
			confidence: "low",
			recommendation_reason: "platform_automated_check_not_possible",
			needs_escalation: true,
			escalation_reason:
				"URL could not be verified — platform blocks automated checks. Manual verification required.",
		});
	});

	it("recommends no update when Deliveroo fallback verifies a live menu", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "not_verifiable", httpStatus: 403 },
				deliverooVerified: "live_menu",
			}),
		).toEqual({
			recommended_status: "No need to update - Still valid",
			confidence: "medium",
			recommendation_reason: "deliveroo_verified_live",
			needs_escalation: false,
		});
	});

	it("recommends human-gated exclusion when Deliveroo fallback verifies not found", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "not_verifiable", httpStatus: 403 },
				deliverooVerified: "not_found",
			}),
		).toEqual({
			recommended_status: "Excluded",
			confidence: "medium",
			recommendation_reason: "deliveroo_verified_not_found",
			needs_escalation: true,
			escalation_reason:
				"Deliveroo URL confirmed not found by browser — replacement or exclusion required; human confirmation needed.",
		});
	});

	it("recommends human-gated exclusion when Deliveroo fallback verifies closed", () => {
		expect(
			recommendCleanupStatus({
				checkState: "checked",
				currentUrl: { result: "not_verifiable", httpStatus: 403 },
				deliverooVerified: "closed",
			}),
		).toEqual({
			recommended_status: "Excluded",
			confidence: "medium",
			recommendation_reason: "deliveroo_verified_closed",
			needs_escalation: true,
			escalation_reason:
				"Deliveroo menu verified as closed by browser — exclude candidate pending human confirmation.",
		});
	});
});
