import { useRef } from "react";
import { RATING_VALUES, RATING_OPTION_CLASSES, type Item } from "./experience-log.constants";

type RatingItemRowProps = {
    item: Item;
    value: number | undefined;
    onSelect: (itemId: string, value: number) => void;
};

// One rated interest: a label plus its own 1-5 radiogroup.
// Owns its own option refs (scoped to this row) so arrow-key navigation can
// move focus between its five buttons without needing a page-wide ref map.
export function RatingItemRow({ item, value, onSelect }: RatingItemRowProps) {
    const optionRefs = useRef(new Map<number, HTMLButtonElement>());
    const selectedIndex = value ? RATING_VALUES.indexOf(value) : 0;

    function handleOptionKeyDown(
        event: React.KeyboardEvent<HTMLButtonElement>,
        currentIndex: number,
    ) {
        let nextIndex: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % RATING_VALUES.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + RATING_VALUES.length) % RATING_VALUES.length;
        }
        if (nextIndex === null) return;

        event.preventDefault();
        const nextValue = RATING_VALUES[nextIndex];
        onSelect(item.id, nextValue);
        optionRefs.current.get(nextValue)?.focus();
    }

    return (
        <div className="mb-[22px]">
            <div className="mb-[10px] text-[17px] font-semibold text-[#2b2b28]">
                {item.label}
            </div>
            <div
                role="radiogroup"
                aria-label={item.label}
                className="flex gap-2"
            >
                {RATING_VALUES.map((option, index) => {
                    const isSelected = value === option;
                    return (
                        <button
                            key={option}
                            ref={(el) => {
                                if (el) {
                                    optionRefs.current.set(option, el);
                                } else {
                                    optionRefs.current.delete(option);
                                }
                            }}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={index === selectedIndex ? 0 : -1}
                            onClick={() => onSelect(item.id, option)}
                            onKeyDown={(event) => handleOptionKeyDown(event, index)}
                            className={`h-11 flex-1 rounded-lg border text-[15px] font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha-600 focus-visible:ring-offset-1 ${
                                RATING_OPTION_CLASSES[isSelected ? "selected" : "unselected"]
                            }`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            <div className="mt-1.5 flex justify-between px-0.5 text-xs text-[#9c8a5f]">
                <span>Not relevant</span>
                <span>Very relevant</span>
            </div>
        </div>
    );
}
