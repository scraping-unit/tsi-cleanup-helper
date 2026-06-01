import type {
  BatchRowResult,
  CleanupStatus,
  DeliverooPageState,
  CurrentUrlResult,
  ProcessedOutputRow,
} from "../types.js";

export const REVIEWER_ACTIONS = [
  "Valid",
  "Update URL",
  "Exclude",
  "Check manually",
] as const;

export type ReviewerAction = (typeof REVIEWER_ACTIONS)[number];

export type UrlHealthIndicator = "accessible" | "dead" | "unverifiable";

export type DisplayRow = ProcessedOutputRow & {
  _kind: "success" | "error";
  _error?: string;
  reviewerAction: ReviewerAction;
  urlHealth: UrlHealthIndicator;
};

type UrlHealthInput = {
  currentUrlResult: CurrentUrlResult;
  deliverooVerified?: DeliverooPageState | undefined;
};

export function getReviewerAction(status: CleanupStatus): ReviewerAction {
  switch (status) {
    case "No need to update - Still valid":
      return "Valid";
    case "URL Updated":
      return "Update URL";
    case "Excluded":
      return "Exclude";
    case "Pending":
    case "Other":
    case "Format updated":
    case "Moved to another brand":
      return "Check manually";
  }
  throw new Error(`Unsupported cleanup status: ${status}`);
}

export function getUrlHealthIndicator(row: UrlHealthInput): UrlHealthIndicator {
  if (row.currentUrlResult === "valid") {
    return "accessible";
  }

  if (row.currentUrlResult === "not_verifiable") {
    if (row.deliverooVerified === "live_menu") {
      return "accessible";
    }
    if (
      row.deliverooVerified === "not_found" ||
      row.deliverooVerified === "closed"
    ) {
      return "dead";
    }
    return "unverifiable";
  }

  if (
    row.currentUrlResult === "inaccessible" ||
    row.currentUrlResult === "redirected" ||
    row.currentUrlResult === "invalid"
  ) {
    return "dead";
  }

  return "unverifiable";
}

export function toDisplayRows(results: BatchRowResult[]): DisplayRow[] {
  return results.map((r): DisplayRow => {
    if (r.ok) {
      return {
        ...r.row,
        _kind: "success",
        reviewerAction: getReviewerAction(r.row.recommendedStatus),
        urlHealth: getUrlHealthIndicator(r.row),
      };
    }
    const rec = r.record;
    return {
      _kind: "error",
      _error: r.error,
      menuId: rec.menuId,
      brandId: rec.brandId,
      brandName: rec.brandName,
      clusterId: rec.clusterId,
      templateName: rec.templateName,
      currentMenuUrl: rec.menuUrl,
      scrapingStatus: rec.scrapingStatus,
      currentUrlResult: "unknown",
      menuContentDetected: false,
      brandMatch: "unknown",
      recommendedStatus: "Pending",
      confidence: "low",
      recommendationReason: r.error,
      needsEscalation: false,
      reviewerAction: "Check manually",
      urlHealth: "unverifiable",
    };
  });
}
