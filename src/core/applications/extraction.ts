import { type ExtractedFact } from './model';

export function classifyPage(text: string): string {
  if (/decyzj[ai]|odmawia\w* prawa|przyznaje\w* prawo/i.test(text)) return 'historical_decision';
  for (const type of ['ZAM', 'ZUR', 'ZAO', 'Z-3b', 'Z-3a', 'Z-3', 'ZAS-12', 'ZAS-53', 'e-ZLA']) {
    if (new RegExp(`\\b${type}\\b`, 'i').test(text)) return type;
  }
  if (/poświadczenie|ubezpieczenie chorobowe/i.test(text)) return 'insurance';
  if (/za życiem/i.test(text)) return 'za_zyciem';
  if (/szpital|hospitalizac/i.test(text)) return 'hospital';
  if (/akt urodzenia/i.test(text)) return 'civil_registry';
  if (/podstaw[ay] składek|wynagrodzenie/i.test(text)) return 'earnings';
  return 'unknown';
}
const extractors: [string, RegExp][] = [
  ['eventDate', /Data zdarzenia\s*:\s*(\d{4}-\d{2}-\d{2})/i],
  ['insuranceSince', /Ubezpieczenie od\s*:\s*(\d{4}-\d{2}-\d{2})/i],
  ['insuranceUntil', /Ubezpieczenie do\s*:\s*(\d{4}-\d{2}-\d{2})/i],
  ['baseGrossCents', /Podstawa brutto grosze\s*:\s*(\d+)/i],
  ['insurance', /Ubezpieczenie chorobowe\s*:\s*(yes|no|unknown)/i],
];
export function extractPageFacts(text: string, source: ExtractedFact['source'], confidence: number): ExtractedFact[] {
  // Deliberately exclude decisions, including their amounts: no target leakage.
  if (source.documentType === 'historical_decision') return [];
  return extractors.flatMap(([key, pattern]) => {
    const value = text.match(pattern)?.[1];
    return value ? [{ key, rawValue: value, normalizedValue: value, confidence, source, reviewed: false, verificationStatus: 'unreviewed' as const }] : [];
  });
}
export function factConflicts(facts: ExtractedFact[]) {
  const keys = [...new Set(facts.filter((f) => f.verificationStatus !== 'rejected').map((f) => f.key))];
  return keys.filter((key) => new Set(facts.filter((f) => f.key === key && f.verificationStatus !== 'rejected').map((f) => f.normalizedValue)).size > 1);
}
