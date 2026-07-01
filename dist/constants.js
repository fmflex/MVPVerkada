// Verkada API constants
export const VERKADA_REGIONS = {
    us: "api",
    eu: "api.eu",
    au: "api.au",
    oh: "api.oh",
};
export function getBaseUrl(region = "us") {
    return `https://${VERKADA_REGIONS[region]}.verkada.com`;
}
// Token is valid for 30 minutes; refresh 2 minutes early to be safe
export const TOKEN_TTL_MS = 28 * 60 * 1000;
export const CHARACTER_LIMIT = 50_000;
//# sourceMappingURL=constants.js.map