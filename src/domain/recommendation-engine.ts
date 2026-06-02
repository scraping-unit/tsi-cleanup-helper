import type { CleanupStatus } from "./statuses.js";
import type {
	Confidence,
	CurrentUrlResult,
	FailedMenuEvidence,
} from "./types.js";

export type RecommendationResult = {
	recommended_status: CleanupStatus;
	confidence: Confidence;
	recommendation_reason: string;
	needs_escalation: boolean;
	escalation_reason?: string;
};

export function recommendCleanupStatus(
	evidence: FailedMenuEvidence,
): RecommendationResult {
	if (evidence.checkState === "not_checked") {
		return recommendation("Pending", "low", "not_checked", false);
	}

	if (evidence.otherExistingBrandMatch) {
		return recommendation(
			"Moved to another brand",
			"low",
			"belongs_to_another_brand",
			true,
			"Human confirmation required before moving a menu to another brand.",
		);
	}

	if (evidence.currentUrl.contentSignal === "closed") {
		return recommendation("Excluded", "high", "platform_confirmed_closed", false);
	}

	if (evidence.justEatVerified === "not_found") {
		return recommendation(
			"Other",
			"medium",
			"justeat_browser_not_found_human_gated",
			true,
			"JustEat browser fallback indicated not_found; v1 requires human confirmation before exclusion or replacement.",
		);
	}

	if (evidence.currentUrl.result === "valid") {
		if (hasConfirmedMatchingMenu(evidence)) {
			if (evidence.format?.mismatch === true) {
				return recommendation(
					"Format updated",
					"medium",
					"format_mismatch_detected",
					false,
				);
			}

			if (evidence.scrapeStillFailed) {
				return recommendation(
					"No need to update - Still valid",
					"medium",
					"valid_but_scrape_failed_escalate_to_vilius",
					true,
					"Current URL appears valid, but scraping still failed.",
				);
			}

			return recommendation(
				"No need to update - Still valid",
				"high",
				"current_url_valid",
				false,
			);
		}

		return manualReview();
	}

	if (evidence.currentUrl.result === "blocked") {
		return recommendation(
			"Other",
			"low",
			"url_blocked_manual_review_required",
			true,
			"URL returned 403/429 — may be bot protection, manual verification needed",
		);
	}

	if (
		evidence.currentUrl.result === "not_verifiable" ||
		(evidence.currentUrl.result === "unknown" && evidence.deliverooVerified)
	) {
		const verified = evidence.deliverooVerified;

		if (verified === "live_menu") {
			return recommendation(
				"No need to update - Still valid",
				"medium",
				"deliveroo_verified_live",
				false,
			);
		}
		if (verified === "not_found") {
			return recommendation(
				"Excluded",
				"medium",
				"deliveroo_browser_not_found_confirmed",
				false,
			);
		}
		if (verified === "closed") {
			return recommendation(
				"Other",
				"medium",
				"deliveroo_browser_closed_human_gated",
				true,
				"Deliveroo browser fallback indicated closed; v1 requires human confirmation before exclusion or replacement.",
			);
		}

		return recommendation(
			"Other",
			"low",
			"platform_automated_check_not_possible",
			true,
			"URL could not be verified — platform blocks automated checks. Manual verification required.",
		);
	}

	if (isUnusableCurrentUrlResult(evidence.currentUrl.result)) {
		if (evidence.candidateUrl?.result === "valid") {
			return recommendation(
				"URL Updated",
				"medium",
				"candidate_url_found",
				false,
			);
		}

		return recommendation(
			"Excluded",
			"low",
			"current_url_unusable_no_candidate",
			false,
		);
	}

	return manualReview();
}

function hasConfirmedMatchingMenu(evidence: FailedMenuEvidence): boolean {
	return evidence.menuContentDetected === true && evidence.brandMatch === true;
}

function isUnusableCurrentUrlResult(result: CurrentUrlResult): boolean {
	return (
		result === "inaccessible" || result === "redirected" || result === "invalid"
	);
}

function manualReview(): RecommendationResult {
	return recommendation(
		"Other",
		"low",
		"manual_review_required",
		true,
		"Evidence is incomplete or conflicting.",
	);
}

function recommendation(
	recommendedStatus: CleanupStatus,
	confidence: Confidence,
	recommendationReason: string,
	needsEscalation: boolean,
	escalationReason?: string,
): RecommendationResult {
	return {
		recommended_status: recommendedStatus,
		confidence,
		recommendation_reason: recommendationReason,
		needs_escalation: needsEscalation,
		...(escalationReason ? { escalation_reason: escalationReason } : {}),
	};
}
