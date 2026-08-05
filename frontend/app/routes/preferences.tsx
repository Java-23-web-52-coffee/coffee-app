import { useRef, useState } from "react";

type PrefValue = "no" | "nice" | "must";

type Item = { id: string; label: string };

const ITEMS: Item[] = [
    { id: "quiet", label: "Quiet atmosphere" },
    { id: "wifi", label: "Strong WiFi" },
    { id: "outlets", label: "Outlets / power" },
    { id: "seating", label: "Comfortable seating" },
    { id: "outdoor-seating", label: "Outdoor seating" },
    { id: "dog-friendly", label: "Dog friendly" },
    { id: "coffee", label: "Good coffee" },
    { id: "food", label: "Food options" },
    { id: "vibe", label: "Vibe / aesthetic" },
];

const OPTIONS: { value: PrefValue; label: string }[] = [
    { value: "no", label: "No" },
    { value: "nice", label: "Nice" },
    { value: "must", label: "Must" },
];

const OPTION_CLASSES: Record<"unselected" | PrefValue, string> = {
    unselected:
        "bg-white border-[oklch(0.88_0.005_90)] text-[oklch(0.55_0.01_90)]",
    no: "bg-[oklch(0.955_0.004_90)] border-[oklch(0.72_0.008_90)] text-[oklch(0.45_0.01_90)]",
    nice: "bg-[oklch(0.97_0.018_250)] border-[oklch(0.7_0.09_250)] text-[oklch(0.45_0.09_250)]",
    must: "bg-[oklch(0.95_0.035_250)] border-[oklch(0.55_0.16_250)] text-[oklch(0.4_0.14_250)]",
};

const MUST_HAVE_SOFT_CAP = 5;

export default function Preferences() {
    const [prefs, setPrefs] = useState<Record<string, PrefValue | undefined>>(
        {},
    );
    const [sheetOpen, setSheetOpen] = useState(false);
    const optionRefs = useRef(new Map<string, HTMLButtonElement>());

    const answeredCount = ITEMS.reduce(
        (count, item) => (prefs[item.id] ? count + 1 : count),
        0,
    );
    const mustItems = ITEMS.filter((item) => prefs[item.id] === "must");

    function selectValue(itemId: string, value: PrefValue) {
        setPrefs((prev) => ({ ...prev, [itemId]: value }));
    }

    function toggleValue(itemId: string, value: PrefValue) {
        setPrefs((prev) => ({
            ...prev,
            [itemId]: prev[itemId] === value ? undefined : value,
        }));
    }

    function handleOptionKeyDown(
        event: React.KeyboardEvent<HTMLButtonElement>,
        itemId: string,
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
        selectValue(itemId, nextValue);
        optionRefs.current.get(`${itemId}:${nextValue}`)?.focus();
    }

    function finalizeSave() {
        const payload = ITEMS.reduce(
            (acc, item) => {
                acc[item.id] = prefs[item.id] ?? "nice";
                return acc;
            },
            {} as Record<string, PrefValue>,
        );
        console.log("Saving preferences", payload);
        setSheetOpen(false);
    }

    function handleSave() {
        if (mustItems.length >= MUST_HAVE_SOFT_CAP) {
            setSheetOpen(true);
            return;
        }
        finalizeSave();
    }

    return (
        <div className="mx-auto w-[390px] bg-white font-[Archivo]">
            <header className="px-[22px] pt-[26px] pb-4 border-b border-[oklch(0.92_0.004_90)]">
                <div className="flex items-baseline justify-between">
                    <h1 className="text-[22px] font-bold tracking-[-0.01em]">
                        Your preferences
                    </h1>
                    <span className="font-mono text-xs text-[oklch(0.5_0.01_90)]">
                        {answeredCount}/{ITEMS.length}
                    </span>
                </div>
                <p className="mt-2.5 text-sm leading-[1.4] text-[oklch(0.45_0.01_90)]">
                    Rate what matters and we&rsquo;ll match cafes to how you
                    actually work.
                </p>
            </header>

            <section className="px-[22px] pt-5 pb-4 flex flex-col gap-3.5">
                <h2 className="text-[15px] font-semibold">
                    How much does each matter?
                </h2>

                <div className="sticky top-0 z-10 bg-white pb-2 border-b border-[oklch(0.93_0.004_90)] grid grid-cols-[1fr_198px] items-end gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.58_0.01_90)]">
                        Matters more →
                    </span>
                    <div className="grid grid-cols-3 gap-[5px] text-center font-mono text-[10px] uppercase leading-tight text-[oklch(0.58_0.01_90)]">
                        <span>
                            Don&rsquo;t
                            <br />
                            care
                        </span>
                        <span>
                            Nice to
                            <br />
                            have
                        </span>
                        <span>
                            Must
                            <br />
                            have
                        </span>
                    </div>
                </div>

                {ITEMS.map((item) => {
                    const value = prefs[item.id];
                    const selectedIndex = value
                        ? OPTIONS.findIndex((option) => option.value === value)
                        : 0;

                    return (
                        <div
                            key={item.id}
                            className="grid grid-cols-[1fr_198px] items-center gap-2 py-1 border-b border-[oklch(0.955_0.003_90)]"
                        >
                            <span className="text-[15px] leading-tight text-[oklch(0.28_0.01_90)]">
                                {item.label}
                            </span>
                            <div
                                role="radiogroup"
                                aria-label={item.label}
                                className="grid grid-cols-3 gap-[5px]"
                            >
                                {OPTIONS.map((option, index) => {
                                    const isSelected = value === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            ref={(el) => {
                                                if (el) {
                                                    optionRefs.current.set(
                                                        `${item.id}:${option.value}`,
                                                        el,
                                                    );
                                                } else {
                                                    optionRefs.current.delete(
                                                        `${item.id}:${option.value}`,
                                                    );
                                                }
                                            }}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            tabIndex={index === selectedIndex ? 0 : -1}
                                            onClick={() => toggleValue(item.id, option.value)}
                                            onKeyDown={(event) =>
                                                handleOptionKeyDown(event, item.id, index)
                                            }
                                            className={`h-11 rounded-[9px] border-[1.5px] text-xs font-medium grid place-items-center transition-colors duration-[120ms] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ring-[oklch(0.55_0.16_250)] ${
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
                })}
            </section>

            <footer className="sticky bottom-0 bg-white border-t border-[oklch(0.92_0.004_90)] px-[22px] pt-3.5 pb-5 flex flex-col gap-2.5">
                <button
                    type="button"
                    onClick={handleSave}
                    className="w-full h-[52px] rounded-xl bg-[oklch(0.24_0.01_90)] hover:bg-[oklch(0.18_0.01_90)] text-white text-base font-semibold grid place-items-center"
                >
                    {answeredCount === 0
                        ? "Save preferences"
                        : `Save ${answeredCount} preference${answeredCount === 1 ? "" : "s"}`}
                </button>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[oklch(0.55_0.01_90)]">
                        You can change these anytime.
                    </span>
                    <button
                        type="button"
                        onClick={finalizeSave}
                        className="text-[13px] font-semibold text-[oklch(0.55_0.16_250)]"
                    >
                        Skip for now
                    </button>
                </div>
            </footer>

            {sheetOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-[oklch(0.2_0.01_90)]/40"
                        onClick={finalizeSave}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="must-sheet-title"
                        className="relative w-[390px] max-w-full bg-white rounded-t-2xl px-[22px] pt-5 pb-6 flex flex-col gap-3.5"
                    >
                        <h2
                            id="must-sheet-title"
                            className="text-[15px] font-semibold leading-tight"
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
                                    onClick={finalizeSave}
                                    className="h-11 rounded-[9px] border-[1.5px] border-[oklch(0.88_0.005_90)] text-left px-3.5 text-sm font-medium text-[oklch(0.28_0.01_90)] grid items-center transition-colors duration-[120ms] motion-reduce:transition-none hover:border-[oklch(0.55_0.16_250)] focus-visible:outline-none focus-visible:ring-2 ring-[oklch(0.55_0.16_250)]"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={finalizeSave}
                            className="mt-1 text-[13px] font-semibold text-[oklch(0.55_0.16_250)] self-start"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
