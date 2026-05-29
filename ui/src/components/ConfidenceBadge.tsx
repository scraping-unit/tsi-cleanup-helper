import { cn } from "@/lib/utils";
import type { Confidence } from "../types";

const CONFIDENCE_CLASSES: Record<Confidence, string> = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-red-100 text-red-800 border-red-200",
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        CONFIDENCE_CLASSES[confidence],
      )}
    >
      {confidence}
    </span>
  );
}
