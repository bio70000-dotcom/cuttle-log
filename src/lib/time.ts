import { DateTime } from "luxon";

export function toKST(isoUtc: string): Date {
  return DateTime.fromISO(isoUtc, { zone: "utc" }).setZone("Asia/Seoul").toJSDate();
}

export function startOfKSTDay(d: Date): Date {
  return DateTime.fromJSDate(d).setZone("Asia/Seoul").startOf("day").toJSDate();
}

export function formatKST(d: Date): string {
  return DateTime.fromJSDate(d).setZone("Asia/Seoul").toFormat("yyyy-LL-dd");
}
