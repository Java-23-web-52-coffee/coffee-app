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
    unselected: "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
    no: "bg-gray-50 border-gray-300 text-gray-600",
    nice: "bg-amber-50 border-amber-300 text-amber-700",
    must: "bg-amber-100 border-amber-600 text-amber-900",
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
        <section className="bg-amber-50">
            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:max-w-4xl xl:max-w-5xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                    Personalize your matches
                </p>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                    <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
                        Your preferences
                    </h1>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                        {answeredCount}/{ITEMS.length} answered
                    </span>
                </div>

                <p className="mt-3 max-w-xl text-gray-600">
                    Rate what matters and we&rsquo;ll match cafes to how you
                    actually work.
                </p>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                            How much does each matter?
                        </h2>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            No &middot; Nice &middot; Must
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {ITEMS.map((item) => {
                            const value = prefs[item.id];
                            const selectedIndex = value
                                ? OPTIONS.findIndex(
                                      (option) => option.value === value,
                                  )
                                : 0;

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                >
                                    <span className="text-sm font-medium text-gray-900">
                                        {item.label}
                                    </span>
                                    <div
                                        role="radiogroup"
                                        aria-label={item.label}
                                        className="grid grid-cols-3 gap-1.5 sm:w-52 sm:shrink-0"
                                    >
                                        {OPTIONS.map((option, index) => {
                                            const isSelected =
                                                value === option.value;
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
                                                    tabIndex={
                                                        index === selectedIndex
                                                            ? 0
                                                            : -1
                                                    }
                                                    onClick={() =>
                                                        toggleValue(
                                                            item.id,
                                                            option.value,
                                                        )
                                                    }
                                                    onKeyDown={(event) =>
                                                        handleOptionKeyDown(
                                                            event,
                                                            item.id,
                                                            index,
                                                        )
                                                    }
                                                    className={`h-10 rounded-lg border text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1 ${
                                                        OPTION_CLASSES[
                                                            isSelected
                                                                ? option.value
                                                                : "unselected"
                                                        ]
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
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                        You can change these anytime.
                    </p>
                    <div className="flex items-center gap-4 sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full rounded-lg bg-amber-700 px-6 py-3 text-base font-semibold text-white hover:bg-amber-800 sm:w-auto"
                        >
                            {answeredCount === 0
                                ? "Save preferences"
                                : `Save ${answeredCount} preference${answeredCount === 1 ? "" : "s"}`}
                        </button>
                        <button
                            type="button"
                            onClick={finalizeSave}
                            className="font-semibold text-amber-700 hover:text-amber-900"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>

            {sheetOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div
                        className="absolute inset-0 bg-gray-900/40"
                        onClick={finalizeSave}
                    />
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
                                    onClick={finalizeSave}
                                    className="grid h-11 items-center rounded-lg border border-gray-200 px-3.5 text-left text-sm font-medium text-gray-900 transition-colors duration-150 hover:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 motion-reduce:transition-none"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={finalizeSave}
                            className="self-start font-semibold text-amber-700 hover:text-amber-900"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}