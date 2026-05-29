import type {
  BatchRowResult,
  ProcessedOutputRow,
} from "../types";

export type DisplayRow = ProcessedOutputRow & {
  _kind: "success" | "error";
  _error?: string;
};

export function toDisplayRows(results: BatchRowResult[]): DisplayRow[] {
  return results.map((r): DisplayRow => {
    if (r.ok) {
      return { ...r.row, _kind: "success" };
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
    };
  });
}
