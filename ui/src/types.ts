export const CLEANUP_STATUSES = [
  "Pending",
  "URL Updated",
  "No need to update - Still valid",
  "Excluded",
  "Format updated",
  "Moved to another brand",
  "Other",
] as const;

export type CleanupStatus = (typeof CLEANUP_STATUSES)[number];

export const CONFIDENCE_VALUES = ["low", "medium", "high"] as const;

export type Confidence = (typeof CONFIDENCE_VALUES)[number];

export const CONTENT_SIGNAL_VALUES = ["active", "closed", "unknown"] as const;

export type ContentSignal = (typeof CONTENT_SIGNAL_VALUES)[number];

export type CurrentUrlResult =
  | "not_checked"
  | "valid"
  | "inaccessible"
  | "redirected"
  | "invalid"
  | "unknown"
  | "blocked"
  | "not_verifiable";

export type MenuPlatform =
  | "deliveroo"
  | "ubereats"
  | "justeat"
  | "foodhub"
  | "pdf"
  | "website"
  | "unknown";

export type BrandMatch = boolean | "unknown";

export type DeliverooPageState = "live_menu" | "not_found" | "closed" | "unknown";

export type NormalizedFailedMenuRecord = {
  brandId: string;
  brandName: string;
  menuId: string;
  menuUrl: string;
  scrapingStatus: string;
  clusterId: string;
  templateName: string;
  menuLink?: string;
  brandGatewayTaskLink?: string;
  menuDefinitionTaskLink?: string;
  scraper?: string;
  status?: string;
  comment?: string;
  menuFormat?: string;
};

export type ProcessedOutputRow = {
  menuId: string;
  brandId: string;
  brandName: string;
  clusterId: string;
  templateName: string;
  currentMenuUrl: string;
  scrapingStatus: string;
  currentUrlResult: CurrentUrlResult;
  httpStatus?: number;
  finalUrl?: string;
  detectedPlatform?: MenuPlatform;
  deliverooVerified?: DeliverooPageState;
  contentType?: string;
  contentSignal?: ContentSignal;
  formatDetected?: string;
  menuContentDetected: boolean;
  brandMatch: BrandMatch;
  candidateNewUrl?: string;
  candidateSource?: string;
  recommendedStatus: CleanupStatus;
  confidence: Confidence;
  recommendationReason: string;
  humanFinalStatus?: CleanupStatus;
  humanComment?: string;
  needsEscalation: boolean;
  escalationReason?: string;
};

export type BatchRowSuccess = { ok: true; row: ProcessedOutputRow };

export type BatchRowError = {
  ok: false;
  index: number;
  record: NormalizedFailedMenuRecord;
  error: string;
};

export type BatchRowResult = BatchRowSuccess | BatchRowError;

export type BatchSummary = {
  total: number;
  processed: number;
  errors: number;
  byStatus: Record<CleanupStatus, number>;
  byConfidence: Record<Confidence, number>;
};

export type BatchProcessResult = {
  results: BatchRowResult[];
  summary: BatchSummary;
};

export type CsvRowError = { rowNumber?: number; message: string };

export type ApiResponse = {
  result: BatchProcessResult;
  csv: string;
  importErrors: CsvRowError[];
};

export type ApiErrorResponse = { error: string; details?: unknown };
