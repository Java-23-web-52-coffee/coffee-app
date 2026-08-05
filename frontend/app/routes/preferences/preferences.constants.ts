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
    nice: "bg-amber-50 border-amber-300 text-amber-700",
    must: "bg-amber-100 border-amber-600 text-amber-900",
};

export const MUST_HAVE_SOFT_CAP = 5;

// "must" items past the soft cap all default to this weight; the tie-break
// sheet lets the profile single one out to carry full weight instead.
export const MUST_IMPORTANCE = 5;
export const MUST_RUNNER_UP_IMPORTANCE = 4;
export const NICE_IMPORTANCE = 3;
