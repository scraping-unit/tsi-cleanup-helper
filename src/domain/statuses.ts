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

export function isCleanupStatus(value: unknown): value is CleanupStatus {
	return (
		typeof value === "string" &&
		CLEANUP_STATUSES.includes(value as CleanupStatus)
	);
}
