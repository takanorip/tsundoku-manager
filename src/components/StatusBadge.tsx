"use client";

import { Badge } from "@cloudflare/kumo";
import { STATUS_LABELS, type ReadingStatus } from "@/lib/types";

const VARIANT: Record<ReadingStatus, "warning" | "info" | "success" | "orange" | "neutral"> = {
  UNREAD: "warning",
  READING: "info",
  FINISHED: "success",
  PAUSED: "orange",
  ABANDONED: "neutral",
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
