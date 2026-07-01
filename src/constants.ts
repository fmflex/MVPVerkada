// Verkada API constants

export const VERKADA_REGIONS = {
  us: "api",
  eu: "api.eu",
  au: "api.au",
  oh: "api.oh",
} as const;

export type VerkadaRegion = keyof typeof VERKADA_REGIONS;

export function getBaseUrl(region: VerkadaRegion = "us"): string {
  return `https://${VERKADA_REGIONS[region]}.verkada.com`;
}

// Token is valid for 30 minutes; refresh 2 minutes early to be safe
export const TOKEN_TTL_MS = 28 * 60 * 1000;

export const CHARACTER_LIMIT = 50_000;
