export type Item = { id: string; label: string };

export const RATING_VALUES: number[] = [1, 2, 3, 4, 5];

export const RATING_OPTION_CLASSES: Record<"unselected" | "selected", string> = {
    unselected: "bg-white border-gray-200 text-gray-500 hover:border-amber-300",
    selected: "bg-amber-100 border-amber-600 text-amber-900",
};
