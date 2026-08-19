import { useState } from "react";
import { Form, Link, redirect, useActionData } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { getAllInterest } from "~/utils/models/interest.model";
import { getMyPreferences } from "~/utils/models/preference.model";
import { getShopById } from "~/utils/models/shop.model";
import { LogVisitFormSchema, postVisit, type LogVisitForm } from "~/utils/models/visit.model";
import type { RatingRequest } from "~/utils/models/rating.model";
import type { FormActionResponse } from "~/utils/interfaces/FormActionResponse";
import { StatusMessage } from "~/components/StatusMessage";
import { destroySession, getSession } from "~/utils/session.server";
import type { Route } from "./+types/experience-log";
import type { Item } from "./experience-log.constants";
import { RatingItemRow } from "./rating-item-row";

const resolver = zodResolver(LogVisitFormSchema);

export async function loader({ request, params }: Route.LoaderArgs) {
    const cookie = request.headers.get("cookie");
    const session = await getSession(cookie);

    const profile = session.get("profile");
    const authorization = session.get("authorization");

    if (!authorization || !profile) {
        return redirect("/sign-in");
    }

    // The URL identifies the café, not a visit — the visit does not exist yet
    // and is created when this form is submitted. See
    // documentation/experience-log-plan.md.
    const shop = await getShopById(params.shopId);

    const [interestsResult, preferencesResult] = await Promise.allSettled([
        getAllInterest(),
        getMyPreferences(authorization, cookie),
    ]);

    if (interestsResult.status === "rejected") console.error(interestsResult.reason);
    if (preferencesResult.status === "rejected") console.error(preferencesResult.reason);

    if (
        preferencesResult.status === "rejected" &&
        (preferencesResult.reason as { status?: number })?.status === 401
    ) {
        return redirect("/sign-in", {
            headers: { "Set-Cookie": await destroySession(session) },
        });
    }

    const interests = interestsResult.status === "fulfilled" ? interestsResult.value : [];
    const preferences = preferencesResult.status === "fulfilled" ? preferencesResult.value : [];

    // Interest ids come back nullable from the schema; drop any that lack one
    // since rating state and React keys are both keyed off item.id.
    const allItems: Item[] = interests.flatMap((interest) =>
        interest.id ? [{ id: interest.id, label: interest.category }] : [],
    );

    // The form defaults to interests the profile already cares about. Rating
    // every interest is opt-in — see decision 4 in the plan.
    const preferredInterestIds = new Set(preferences.map((preference) => preference.interestId));
    const items: Item[] = allItems.filter((item) => preferredInterestIds.has(item.id));

    // An empty `items` means one of two unrelated things, and they need
    // different copy: the profile has no preferences yet (send them to
    // /preferences), or a fetch failed and we genuinely don't know (show an
    // error, and never tell someone to set preferences they may already have).
    const loadFailed =
        interestsResult.status === "rejected" || preferencesResult.status === "rejected";

    return { shop, items, allItems, loadFailed };
}

export async function action({ request, params }: Route.ActionArgs): Promise<FormActionResponse | Response> {
    const cookie = request.headers.get("cookie");
    const session = await getSession(cookie);

    const profile = session.get("profile");
    const authorization = session.get("authorization");

    if (!authorization || !profile) {
        return redirect("/sign-in");
    }

    const { errors, data, receivedValues: defaultValues } = await getValidatedFormData<LogVisitForm>(request, resolver);
    if (errors) {
        return { errors, defaultValues };
    }

    // One request, one transaction: the visit row and every rating row commit
    // together, so there is no partial-save state to report here.
    const status = await postVisit(params.shopId, data.ratings, authorization, cookie);
    return { success: status.status === 201, status };
}

export default function ExperienceLog({ loaderData }: Route.ComponentProps) {
    const { shop, items, allItems, loadFailed } = loaderData;

    const [ratings, setRatings] = useState<Record<string, number | undefined>>({});
    const [rateAll, setRateAll] = useState(false);

    const { handleSubmit, setValue } = useRemixForm<LogVisitForm>({
        mode: "onSubmit",
        resolver,
        defaultValues: { ratings: [] },
    });
    const actionData = useActionData<typeof action>();
    const submitted = actionData !== undefined && "success" in actionData && actionData.success;

    const visibleItems = rateAll ? allItems : items;
    const hiddenCount = allItems.length - items.length;

    // State is the source of truth, not the current view: collapsing back to
    // the short form hides rows but never discards a score the user already
    // gave. The button label carries the real count so nothing is submitted
    // invisibly.
    const ratedEntries: RatingRequest[] = allItems.flatMap((item) => {
        const value = ratings[item.id];
        return value ? [{ interestId: item.id, value }] : [];
    });

    function selectValue(itemId: string, value: number) {
        setRatings((prev) => ({ ...prev, [itemId]: value }));
    }

    function handleFormSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        setValue("ratings", ratedEntries);
        handleSubmit(event);
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#f8f8f6]">
            <div className="flex gap-8 max-w-[900px] w-full flex-wrap">

                <div className="flex-1 min-w-[380px] bg-white border border-[#ece6d6] rounded-[10px] shadow-sm p-10">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#f4e9d3] flex items-center justify-center mb-8">
                        <img
                            src={shop.imageUrl || "/coffeeshop-placeholder.png"}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-center">
                        <div className="text-[22px] font-semibold text-[#2b2b28] mb-1">{shop.name}</div>
                        <div className="text-sm text-[#6b675c]">{shop.address}</div>
                    </div>
                </div>

                <div className="flex-1 min-w-[340px] bg-white border border-[#ece6d6] rounded-[10px] p-7 flex flex-col justify-center">
                    {submitted ? (
                        <div className="py-5">
                            <div className="text-lg font-semibold text-[#2b2b28] mb-4 text-center">
                                Experience logged
                            </div>
                            {ratedEntries.map((entry) => (
                                <div
                                    key={entry.interestId}
                                    className="flex justify-between text-sm text-[#4a473f] py-2 border-t border-[#f0eee6]"
                                >
                                    <span>{allItems.find((item) => item.id === entry.interestId)?.label}</span>
                                    <span className="font-semibold text-[#2b2b28]">{entry.value} / 5</span>
                                </div>
                            ))}
                            <p className="mt-5 text-center text-xs text-[#6b675c]">
                                Logged experiences can&rsquo;t be edited. Visiting again? Log it as a new
                                experience.
                            </p>
                        </div>
                    ) : loadFailed ? (
                        <div className="py-5 text-center">
                            <div className="text-lg font-semibold text-[#2b2b28] mb-2">
                                We couldn&rsquo;t load this form
                            </div>
                            <p className="text-sm text-[#6b675c]">
                                Something went wrong fetching the things you can rate. Please reload
                                the page to try again.
                            </p>
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="py-5 text-center">
                            <div className="text-lg font-semibold text-[#2b2b28] mb-2">
                                Nothing to rate yet
                            </div>
                            <p className="text-sm text-[#6b675c]">
                                There aren&rsquo;t any interests set up to rate a café against.
                            </p>
                        </div>
                    ) : items.length === 0 && !rateAll ? (
                        <div className="py-5 text-center">
                            <div className="text-lg font-semibold text-[#2b2b28] mb-2">
                                Set your preferences first
                            </div>
                            <p className="text-sm text-[#6b675c] mb-5">
                                Tell us what matters to you and we&rsquo;ll ask how well{" "}
                                {shop.name} delivered on it.
                            </p>
                            <Link
                                to="/preferences"
                                className="inline-block rounded-lg bg-mocha-700 px-6 py-3 text-[15px] font-semibold text-white hover:bg-mocha-800"
                            >
                                Choose your preferences
                            </Link>
                            <button
                                type="button"
                                onClick={() => setRateAll(true)}
                                className="mt-4 block w-full text-sm font-semibold text-mocha-700 hover:text-mocha-900"
                            >
                                Or rate all {allItems.length} interests
                            </button>
                        </div>
                    ) : (
                        <Form onSubmit={handleFormSubmit} noValidate method="POST">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#9c8a5f] mb-5">
                                How well did {shop.name} deliver?
                            </div>

                            {visibleItems.map((item) => (
                                <RatingItemRow
                                    key={item.id}
                                    item={item}
                                    value={ratings[item.id]}
                                    onSelect={selectValue}
                                />
                            ))}

                            {hiddenCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setRateAll((prev) => !prev)}
                                    className="mb-5 block w-full text-sm font-semibold text-mocha-700 hover:text-mocha-900"
                                >
                                    {rateAll
                                        ? "Show only my preferences"
                                        : `Rate all ${allItems.length} interests (${hiddenCount} more)`}
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={ratedEntries.length === 0}
                                className={`w-full h-12 rounded-lg border-none text-[15px] font-semibold transition-colors duration-150 ${
                                    ratedEntries.length > 0
                                        ? "text-white bg-mocha-700 hover:bg-mocha-800 cursor-pointer"
                                        : "text-gray-400 bg-gray-100 cursor-not-allowed"
                                }`}
                            >
                                {ratedEntries.length === 0
                                    ? "Rate at least one to log"
                                    : `Log experience (${ratedEntries.length} rated)`}
                            </button>

                            <p className="mt-3 text-center text-xs text-[#6b675c]">
                                Rate as many or as few as you like. Once logged, this experience
                                can&rsquo;t be edited.
                            </p>

                            <StatusMessage actionData={actionData} />
                        </Form>
                    )}
                </div>

            </div>
        </div>
    );
}
