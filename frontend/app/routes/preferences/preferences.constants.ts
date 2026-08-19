export type PrefValue = "no" | "nice" | "must";

export type Item = { id: string; label: string };

export const OPTIONS: { value: PrefValue; label: string }[] = [
    { value: "no", label: "No" },
    { value: "nice", label: "Nice" },
    { value: "must", label: "Must" },
];

export const OPTION_CLASSES: Record<"unselected" | PrefValue, string> = {
    unselected: "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
    no: "bg-gray-50 border-gray-300 text-gray-600",
    nice: "bg-mocha-50 border-mocha-300 text-mocha-700",
    must: "bg-mocha-100 border-mocha-600 text-mocha-900",
};

export const MUST_HAVE_SOFT_CAP = 5;

// "must" items past the soft cap all default to this weight; the tie-break
// sheet lets the profile single one out to carry full weight instead.
export const MUST_IMPORTANCE = 1;
export const MUST_RUNNER_UP_IMPORTANCE = 0.8;
export const NICE_IMPORTANCE = 0.5;
export const NO_IMPORTANCE = 0;

// Inverse of the forward mapping above: turns a saved 0–1 importance back
// into the UI's tri-state value. Uses thresholds (not exact equality) so
// both MUST_IMPORTANCE (1, the picked tie-break winner) and
// MUST_RUNNER_UP_IMPORTANCE (0.8, everyone else marked "must") map back to
// "must", and any legacy/edge decimal values still resolve sensibly.
export function importanceToPrefValue(importance: number): PrefValue {
    if (importance >= MUST_RUNNER_UP_IMPORTANCE) return "must";
    if (importance > NO_IMPORTANCE) return "nice";
    return "no";
}
