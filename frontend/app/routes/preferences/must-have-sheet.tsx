import type { Item } from "./preferences.constants";

type MustHaveSheetProps = {
    open: boolean;
    mustItems: Item[];
    onPick: (itemId: string) => void;
    onSkip: () => void;
};

// The tie-break bottom sheet shown once 5+ interests are marked "must" —
// lets the profile single one out to carry full weight over the rest.
export function MustHaveSheet({ open, mustItems, onPick, onSkip }: MustHaveSheetProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-gray-900/40" onClick={onSkip} />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="must-sheet-title"
                className="relative flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white px-6 py-6 shadow-lg sm:rounded-2xl"
            >
                <h2
                    id="must-sheet-title"
                    className="text-lg font-bold leading-tight text-gray-900"
                >
                    If a cafe only got one of these right, which?
                </h2>
                <div
                    role="radiogroup"
                    aria-label="Top must-have"
                    className="flex flex-col gap-2"
                >
                    {mustItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="radio"
                            aria-checked={false}
                            onClick={() => onPick(item.id)}
                            className="grid h-11 items-center rounded-lg border border-gray-200 px-3.5 text-left text-sm font-medium text-gray-900 transition-colors duration-150 hover:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 motion-reduce:transition-none"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onSkip}
                    className="self-start font-semibold text-amber-700 hover:text-amber-900"
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
