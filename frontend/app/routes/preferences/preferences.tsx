import { useState } from "react";
import { Form, redirect, useActionData } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { getAllInterest } from "~/utils/models/interest.model";
import {
    postPreferences,
    PreferencesFormSchema,
    type PreferenceRequest,
    type PreferencesForm,
} from "~/utils/models/preference.model";
import type { FormActionResponse } from "~/utils/interfaces/FormActionResponse";
import { StatusMessage } from "~/components/StatusMessage";
import { getSession } from "~/utils/session.server";
import type { Route } from "./+types/preferences"
import {
    MUST_HAVE_SOFT_CAP,
    MUST_IMPORTANCE,
    MUST_RUNNER_UP_IMPORTANCE,
    NICE_IMPORTANCE,
    NO_IMPORTANCE,
    type Item,
    type PrefValue,
} from "./preferences.constants";
import { PreferenceItemRow } from "./preference-item-row";
import { MustHaveSheet } from "./must-have-sheet";

const resolver = zodResolver(PreferencesFormSchema)

export async function loader({ request }: Route.LoaderArgs) {
    const cookie = request.headers.get("cookie")
    const session = await getSession(cookie)

    const profile = session.get("profile")
    const authorization = session.get("authorization")

    if (!authorization || !profile){
        return redirect("/sign-in")
    }try{
        const interests = await getAllInterest()
        return { interests }
    }catch (error){
        console.error(error)
        return { interests: [] }
    }


}

export async function action({ request }: Route.ActionArgs): Promise<FormActionResponse | Response> {
    const cookie = request.headers.get("cookie")
    const session = await getSession(cookie)

    const profile = session.get("profile")
    const authorization = session.get("authorization")

    if (!authorization || !profile) {
        return redirect("/sign-in")
    }

    const { errors, data, receivedValues: defaultValues } = await getValidatedFormData<PreferencesForm>(request, resolver)
    if (errors) {
        return { errors, defaultValues }
    }

    const status = await postPreferences(data.preferences, authorization, cookie)
    return { success: status.status === 200, status }
}

export default function Preferences({ loaderData} : Route.ComponentProps) {
    const {interests} = loaderData;

    // Interest ids come back nullable from the schema; drop any that lack
    // one since we key preference state and React lists off item.id.
    const items: Item[] = interests.flatMap((interest) =>
        interest.id ? [{ id: interest.id, label: interest.category }] : [],
    );

    const [prefs, setPrefs] = useState<Record<string, PrefValue | undefined>>(
        {},
    );
    const [sheetOpen, setSheetOpen] = useState(false);

    const { handleSubmit, setValue } = useRemixForm<PreferencesForm>({
        mode: "onSubmit",
        resolver,
        defaultValues: { preferences: [] },
    });
    const actionData = useActionData<typeof action>();

    const answeredCount = items.reduce(
        (count, item) => (prefs[item.id] ? count + 1 : count),
        0,
    );
    const mustItems = items.filter((item) => prefs[item.id] === "must");

    function selectValue(itemId: string, value: PrefValue) {
        setPrefs((prev) => ({ ...prev, [itemId]: value }));
    }

    function toggleValue(itemId: string, value: PrefValue) {
        setPrefs((prev) => ({
            ...prev,
            [itemId]: prev[itemId] === value ? undefined : value,
        }));
    }

    // "No" is a real, persisted answer — it's saved as importance 0, which
    // overwrites (via the 409→PUT retry) any "nice"/"must" previously saved
    // for that interest. Only truly unanswered items are left out of the
    // submission entirely.
    function buildPreferenceEntries(pickedMustId: string | null): PreferenceRequest[] {
        return items.flatMap((item) => {
            const value = prefs[item.id];
            let importance: number | null = null;
            if (value === "must") {
                importance =
                    pickedMustId === null || pickedMustId === item.id
                        ? MUST_IMPORTANCE
                        : MUST_RUNNER_UP_IMPORTANCE;
            } else if (value === "nice") {
                importance = NICE_IMPORTANCE;
            } else if (value === "no") {
                importance = NO_IMPORTANCE;
            }
            return importance === null ? [] : [{ interestId: item.id, importance }];
        });
    }

    // Used by every path that doesn't go through the form's native submit:
    // the tie-break sheet's per-item picks, its "Skip" button, the backdrop
    // click, and the footer's "Skip for now" link.
    function finalizeSave(pickedMustId: string | null = null) {
        setValue("preferences", buildPreferenceEntries(pickedMustId));
        setSheetOpen(false);
        void handleSubmit();
    }

    function handleFormSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        if (mustItems.length >= MUST_HAVE_SOFT_CAP) {
            event.preventDefault();
            setSheetOpen(true);
            return;
        }
        setValue("preferences", buildPreferenceEntries(null));
        handleSubmit(event);
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
                        {answeredCount}/{items.length} answered
                    </span>
                </div>

                <p className="mt-3 max-w-xl text-gray-600">
                    Rate what matters and we&rsquo;ll match cafes to how you
                    actually work.
                </p>

                <Form onSubmit={handleFormSubmit} noValidate method="POST">
                    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-gray-900">
                                How much does each matter?
                            </h2>
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                No &middot; Nice &middot; Must
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {items.map((item) => (
                                <PreferenceItemRow
                                    key={item.id}
                                    item={item}
                                    value={prefs[item.id]}
                                    onToggle={toggleValue}
                                    onSelect={selectValue}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500">
                            You can change these anytime.
                        </p>
                        <div className="flex items-center gap-4 sm:flex-row-reverse">
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-amber-700 px-6 py-3 text-base font-semibold text-white hover:bg-amber-800 sm:w-auto"
                            >
                                {answeredCount === 0
                                    ? "Save preferences"
                                    : `Save ${answeredCount} preference${answeredCount === 1 ? "" : "s"}`}
                            </button>
                            <button
                                type="button"
                                onClick={() => finalizeSave()}
                                className="font-semibold text-amber-700 hover:text-amber-900"
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>

                    <StatusMessage actionData={actionData} />
                </Form>
            </div>

            <MustHaveSheet
                open={sheetOpen}
                mustItems={mustItems}
                onPick={(itemId) => finalizeSave(itemId)}
                onSkip={() => finalizeSave()}
            />
        </section>
    );
}
