import type { MenuPlatform } from "./platform-detection.js";
import type { CleanupStatus } from "./statuses.js";

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

export type BrandMatch = boolean | "unknown";

export type UrlCheckEvidence = {
	result: CurrentUrlResult;
	httpStatus?: number | undefined;
	finalUrl?: string | undefined;
	detectedPlatform?: MenuPlatform | undefined;
	contentType?: string | undefined;
	contentSignal?: ContentSignal | undefined;
};

export type CandidateUrlEvidence = {
	url: string;
	source?: MenuPlatform | undefined;
	result: Exclude<CurrentUrlResult, "not_checked">;
	finalUrl?: string | undefined;
};

export type FormatEvidence = {
	stored?: string | undefined;
	detected?: string | undefined;
	mismatch: boolean | "unknown";
};

export type OtherExistingBrandMatch = {
	brandId: string;
	brandName?: string | undefined;
};

export type FailedMenuEvidence = {
	checkState: "not_checked" | "checked";
	currentUrl: UrlCheckEvidence;
	menuContentDetected?: boolean | "unknown" | undefined;
	brandMatch?: BrandMatch | undefined;
	candidateUrl?: CandidateUrlEvidence | undefined;
	format?: FormatEvidence | undefined;
	scrapeStillFailed?: boolean | undefined;
	otherExistingBrandMatch?: OtherExistingBrandMatch | undefined;
};

export type NormalizedFailedMenuRecord = {
	brandId: string;
	brandName: string;
	menuId: string;
	menuUrl: string;
	scrapingStatus: string;
	clusterId: string;
	templateName: string;
	menuLink?: string | undefined;
	brandGatewayTaskLink?: string | undefined;
	menuDefinitionTaskLink?: string | undefined;
	scraper?: string | undefined;
	status?: string | undefined;
	comment?: string | undefined;
	menuFormat?: string | undefined;
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
