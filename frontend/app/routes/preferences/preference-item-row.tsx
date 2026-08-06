import { useRef } from "react";
import { OPTIONS, OPTION_CLASSES, type Item, type PrefValue } from "./preferences.constants";

type PreferenceItemRowProps = {
    item: Item;
    value: PrefValue | undefined;
    onToggle: (itemId: string, value: PrefValue) => void;
    onSelect: (itemId: string, value: PrefValue) => void;
};

// One rated interest: a label plus its own No / Nice / Must radiogroup.
// Owns its own option refs (scoped to this row) so arrow-key navigation can
// move focus between its three buttons without needing a page-wide ref map.
export function PreferenceItemRow({ item, value, onToggle, onSelect }: PreferenceItemRowProps) {
    const optionRefs = useRef(new Map<PrefValue, HTMLButtonElement>());
    const selectedIndex = value
        ? OPTIONS.findIndex((option) => option.value === value)
        : 0;

    function handleOptionKeyDown(
        event: React.KeyboardEvent<HTMLButtonElement>,
        currentIndex: number,
    ) {
        let nextIndex: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % OPTIONS.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
        }
        if (nextIndex === null) return;

        event.preventDefault();
        const nextValue = OPTIONS[nextIndex].value;
        onSelect(item.id, nextValue);
        optionRefs.current.get(nextValue)?.focus();
    }

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="text-sm font-medium text-gray-900">
                {item.label}
            </span>
            <div
                role="radiogroup"
                aria-label={item.label}
                className="grid grid-cols-3 gap-1.5 sm:w-52 sm:shrink-0"
            >
                {OPTIONS.map((option, index) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            ref={(el) => {
                                if (el) {
                                    optionRefs.current.set(option.value, el);
                                } else {
                                    optionRefs.current.delete(option.value);
                                }
                            }}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={index === selectedIndex ? 0 : -1}
                            onClick={() => onToggle(item.id, option.value)}
                            onKeyDown={(event) => handleOptionKeyDown(event, index)}
                            className={`h-10 rounded-lg border text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1 ${
                                OPTION_CLASSES[isSelected ? option.value : "unselected"]
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
