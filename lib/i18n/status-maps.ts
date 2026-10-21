import type { MessageKey } from "./locale-provider";
import type { TransportShift, ManifestFeeStatus } from "@/lib/api/types";

export const SHIFT_KEY: Record<TransportShift, MessageKey> = {
  MORNING: "shift.morning",
  EVENING: "shift.evening",
  BOTH: "shift.both",
};

export function shiftKey(shift: string): MessageKey {
  return SHIFT_KEY[shift as TransportShift] ?? "shift.morning";
}

export const FEE_KEY: Record<ManifestFeeStatus, MessageKey> = {
  NOT_BILLED: "fee.notBilled",
  PAID: "fee.paid",
  PARTIAL: "fee.partial",
  PENDING: "fee.pending",
};
