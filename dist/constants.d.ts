export declare const VERKADA_REGIONS: {
    readonly us: "api";
    readonly eu: "api.eu";
    readonly au: "api.au";
    readonly oh: "api.oh";
};
export type VerkadaRegion = keyof typeof VERKADA_REGIONS;
export declare function getBaseUrl(region?: VerkadaRegion): string;
export declare const TOKEN_TTL_MS: number;
export declare const CHARACTER_LIMIT = 50000;
//# sourceMappingURL=constants.d.ts.map