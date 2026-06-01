import { describe, expect, it } from "vitest";

import {
  getReviewerAction,
  getUrlHealthIndicator,
  toDisplayRows,
} from "../ui/src/lib/toDisplayRows.js";
import type {
  BatchRowResult,
  CleanupStatus,
  CurrentUrlResult,
  DeliverooPageState,
  ProcessedOutputRow,
} from "../ui/src/types.js";

const BASE_ROW: ProcessedOutputRow = {
  menuId: "menu-1",
  brandId: "brand-1",
  brandName: "Test Brand",
  clusterId: "cluster-1",
  templateName: "template-1",
  currentMenuUrl: "https://example.com/menu",
  scrapingStatus: "FAILED",
  currentUrlResult: "valid",
  httpStatus: 200,
  menuContentDetected: false,
  brandMatch: "unknown",
  recommendedStatus: "Other",
  confidence: "low",
  recommendationReason: "manual_review_required",
  needsEscalation: true,
};

function rowFor(
  recommendedStatus: CleanupStatus,
  recommendationReason = "manual_review_required",
): BatchRowResult {
  return {
    ok: true,
    row: {
      ...BASE_ROW,
      recommendedStatus,
      recommendationReason,
    },
  };
}

function rowForUrlHealth(
  currentUrlResult: CurrentUrlResult,
  deliverooVerified?: DeliverooPageState,
): BatchRowResult {
  return {
    ok: true,
    row: {
      ...BASE_ROW,
      currentUrlResult,
      ...(deliverooVerified ? { deliverooVerified } : {}),
    },
  };
}

describe("reviewer action display rows", () => {
  it("maps every cleanup status to one of the reviewer-facing actions", () => {
    expect(getReviewerAction("No need to update - Still valid")).toBe("Valid");
    expect(getReviewerAction("URL Updated")).toBe("Update URL");
    expect(getReviewerAction("Excluded")).toBe("Exclude");
    expect(getReviewerAction("Pending")).toBe("Check manually");
    expect(getReviewerAction("Other")).toBe("Check manually");
    expect(getReviewerAction("Format updated")).toBe("Check manually");
    expect(getReviewerAction("Moved to another brand")).toBe("Check manually");
  });

  it("shows blocked rows as check manually while preserving the technical reason", () => {
    const [row] = toDisplayRows([
      rowFor("Other", "url_blocked_manual_review_required"),
    ]);

    expect(row?.reviewerAction).toBe("Check manually");
    expect(row?.recommendationReason).toBe("url_blocked_manual_review_required");
    expect(row?.recommendedStatus).toBe("Other");
  });

  it("shows not-verifiable rows as check manually while preserving the technical reason", () => {
    const [row] = toDisplayRows([
      rowFor("Other", "platform_automated_check_not_possible"),
    ]);

    expect(row?.reviewerAction).toBe("Check manually");
    expect(row?.recommendationReason).toBe("platform_automated_check_not_possible");
    expect(row?.recommendedStatus).toBe("Other");
  });

  it("maps accessible URL states to the green health indicator", () => {
    expect(getUrlHealthIndicator({ currentUrlResult: "valid" })).toBe("accessible");
    expect(getUrlHealthIndicator({
      currentUrlResult: "not_verifiable",
      deliverooVerified: "live_menu",
    })).toBe("accessible");
  });

  it("maps dead URL states to the red health indicator", () => {
    expect(getUrlHealthIndicator({ currentUrlResult: "inaccessible" })).toBe("dead");
    expect(getUrlHealthIndicator({ currentUrlResult: "redirected" })).toBe("dead");
    expect(getUrlHealthIndicator({ currentUrlResult: "invalid" })).toBe("dead");
    expect(getUrlHealthIndicator({
      currentUrlResult: "not_verifiable",
      deliverooVerified: "not_found",
    })).toBe("dead");
    expect(getUrlHealthIndicator({
      currentUrlResult: "not_verifiable",
      deliverooVerified: "closed",
    })).toBe("dead");
  });

  it("maps unverifiable URL states to the yellow health indicator", () => {
    expect(getUrlHealthIndicator({ currentUrlResult: "blocked" })).toBe("unverifiable");
    expect(getUrlHealthIndicator({ currentUrlResult: "unknown" })).toBe("unverifiable");
    expect(getUrlHealthIndicator({ currentUrlResult: "not_checked" })).toBe("unverifiable");
    expect(getUrlHealthIndicator({ currentUrlResult: "not_verifiable" })).toBe("unverifiable");
    expect(getUrlHealthIndicator({
      currentUrlResult: "not_verifiable",
      deliverooVerified: "unknown",
    })).toBe("unverifiable");
  });

  it("adds URL health to success and error display rows", () => {
    const [accessible, dead, unverifiable, error] = toDisplayRows([
      rowForUrlHealth("valid"),
      rowForUrlHealth("redirected"),
      rowForUrlHealth("blocked"),
      {
        ok: false,
        index: 1,
        record: {
          brandId: "brand-1",
          brandName: "Test Brand",
          menuId: "menu-2",
          menuUrl: "https://example.com/broken",
          scrapingStatus: "FAILED",
          clusterId: "cluster-1",
          templateName: "template-1",
        },
        error: "missing required field",
      },
    ]);

    expect(accessible?.urlHealth).toBe("accessible");
    expect(dead?.urlHealth).toBe("dead");
    expect(unverifiable?.urlHealth).toBe("unverifiable");
    expect(error?.urlHealth).toBe("unverifiable");
  });
});
