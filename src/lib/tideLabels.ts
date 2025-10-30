// =====================================================
//  National Tide Label System (29-day lunar cycle)
//  Code: English, UI strings: Korean
// =====================================================

import { diffDaysKST } from './timeKST';

/**
 * Regional 29-day tide label sequences (one full lunar cycle).
 * These represent the traditional Korean tide stage labels.
 * Each array contains 29 Korean labels for days 0-28 of the lunar cycle.
 */

// 서해 (West) - Traditional sequence
export const seohaeLabels = [
  "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물", "10물", 
  "11물", "12물", "13물", "14물", "조금", "무시",
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "조금"
] as const;

// 남해 (South/Masan) - Standard sequence used nationwide
export const namhaeLabels = [
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "14물", "조금",
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "조금"
] as const;

// 동해 (East) - Traditional sequence
export const donghaeLabels = [
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "14물", "조금",
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "조금"
] as const;

// 제주 (Jeju) - Traditional sequence
export const jejuLabels = [
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "14물", "조금",
  "1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물",
  "10물", "11물", "12물", "13물", "조금"
] as const;

/**
 * National standard tide labels: uses 남해(마산) as the single source of truth.
 * This ensures consistent tide stage labels across all regions.
 */
export const nationalTideLabels = namhaeLabels;

/**
 * National label anchor date in KST.
 * This is the reference date (index=0) for the 29-day cycle.
 * Based on the provided table: 2025-10-29 is "1물" (index 0).
 */
export const NATIONAL_LABEL_ANCHOR_KST_ISO = "2025-10-29T00:00:00+09:00";

/**
 * Get national tide label by day index (0..28).
 * @param idx - Day index in the 29-day lunar cycle (0-based)
 * @returns Korean tide stage label (e.g., "1물", "조금")
 */
export function getNationalTideLabel(idx: number): string {
  const index = Math.max(0, Math.min(28, Math.floor(idx)));
  return nationalTideLabels[index];
}

/**
 * Get 서해 labels with fixed offset (+1 day shift correction).
 * Use this if you need raw 서해 labels elsewhere with the -1 shift neutralized.
 * @returns Array of 29 labels with the offset corrected
 */
export function getSeohaeLabelsFixed(): readonly string[] {
  const src = seohaeLabels;
  const out = [...src];
  // Shift forward by one day
  for (let i = 0; i < out.length - 1; i++) {
    out[i] = src[i + 1];
  }
  // Keep last as-is (or could inject external D+1 if available)
  out[out.length - 1] = src[out.length - 1];
  return out;
}

/**
 * Convert moon age (days) to label index (0..28).
 * @param moonAgeDays - Moon age in days (0..29.53)
 * @returns Label index (0..28)
 */
export function moonAgeToLabelIndex(moonAgeDays: number): number {
  const cycleLength = 29.530588;
  const normalized = ((moonAgeDays % cycleLength) + cycleLength) % cycleLength;
  const index = Math.floor((normalized / cycleLength) * 29);
  return Math.max(0, Math.min(28, index));
}

/**
 * Get national tide label from moon age.
 * @param moonAgeDays - Moon age in days (0..29.53)
 * @returns Korean tide stage label
 */
export function getNationalTideLabelFromMoonAge(moonAgeDays: number): string {
  const idx = moonAgeToLabelIndex(moonAgeDays);
  return getNationalTideLabel(idx);
}

/**
 * Get today's tide label based on KST calendar date.
 * This is the primary method for determining tide labels.
 * @param today - Date to get label for (defaults to now)
 * @returns Korean tide stage label (e.g., "1물", "조금")
 */
export function getTodayTideLabelKST(today: Date = new Date()): string {
  const anchor = new Date(NATIONAL_LABEL_ANCHOR_KST_ISO);
  const idx = diffDaysKST(today, anchor);
  
  // Clamp to valid range [0, 28]
  const safeIdx = Math.max(0, Math.min(28, idx));
  
  return nationalTideLabels[safeIdx];
}
