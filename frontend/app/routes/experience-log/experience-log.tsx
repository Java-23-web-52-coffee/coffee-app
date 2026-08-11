import { useState } from "react";
import { Form, redirect, useActionData } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { getAllInterest } from "~/utils/models/interest.model";
import { getMyPreferences } from "~/utils/models/preference.model";
import { getShopById } from "~/utils/models/shop.model";
import { getVisitById } from "~/utils/models/visit.model";
import {
    getRatings,
    postRatings,
    RatingsFormSchema,
    type RatingRequest,
    type RatingsForm,
} from "~/utils/models/rating.model";
import type { FormActionResponse } from "~/utils/interfaces/FormActionResponse";
import { StatusMessage } from "~/components/StatusMessage";
import { destroySession, getSession } from "~/utils/session.server";
import type { Route } from "./+types/experience-log";
import type { Item } from "./experience-log.constants";
import { RatingItemRow } from "./rating-item-row";

const resolver = zodResolver(RatingsFormSchema);

export async function loader({ request, params }: Route.LoaderArgs) {
    const cookie = request.headers.get("cookie");
    const session = await getSession(cookie);

    const profile = session.get("profile");
    const authorization = session.get("authorization");

    if (!authorization || !profile) {
        return redirect("/sign-in");
    }

    const visitId = params.visitId;

    let visit;
    try {
        visit = await getVisitById(visitId);
    } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
            throw new Response("Visit not found", { status: 404 });
        }
        throw error;
    }

    if (visit.profileId !== profile.id) {
        throw new Response("You may only rate your own visits", { status: 403 });
    }

    const shop = await getShopById(visit.shopId);

    const [interestsResult, preferencesResult, ratingsResult] = await Promise.allSettled([
        getAllInterest(),
        getMyPreferences(authorization, cookie),
        getRatings(visitId, authorization, cookie),
    ]);

    if (interestsResult.status === "rejected") console.error(interestsResult.reason);
    if (preferencesResult.status === "rejected") console.error(preferencesResult.reason);
    if (ratingsResult.status === "rejected") console.error(ratingsResult.reason);

    const authFailed = [preferencesResult, ratingsResult].some(
        (result) => result.status === "rejected" && (result.reason as { status?: number })?.status === 401,
    );
    if (authFailed) {
        return redirect("/sign-in", {
            headers: { "Set-Cookie": await destroySession(session) },
        });
    }

    const interests = interestsResult.status === "fulfilled" ? interestsResult.value : [];
    const preferences = preferencesResult.status === "fulfilled" ? preferencesResult.value : [];
    const ratings = ratingsResult.status === "fulfilled" ? ratingsResult.value : [];

    // Only rate interests the profile already cares about, not the full
    // global interest list.
    const preferredInterestIds = new Set(preferences.map((preference) => preference.interestId));
    const items: Item[] = interests.flatMap((interest) =>
        interest.id && preferredInterestIds.has(interest.id)
            ? [{ id: interest.id, label: interest.category }]
            : [],
    );

    return { shop, items, ratings };
}

export async function action({ request, params }: Route.ActionArgs): Promise<FormActionResponse | Response> {
    const cookie = request.headers.get("cookie");
    const session = await getSession(cookie);

    const profile = session.get("profile");
    const authorization = session.get("authorization");

    if (!authorization || !profile) {
        return redirect("/sign-in");
    }

    const visitId = params.visitId;

    const { errors, data, receivedValues: defaultValues } = await getValidatedFormData<RatingsForm>(request, resolver);
    if (errors) {
        return { errors, defaultValues };
    }

    const status = await postRatings(visitId, data.ratings, authorization, cookie);
    return { success: status.status === 200, status };
}

export default function ExperienceLog({ loaderData }: Route.ComponentProps) {
    const { shop, items, ratings: savedRatings } = loaderData;

    const [ratings, setRatings] = useState<Record<string, number | undefined>>(() => {
        const initial: Record<string, number | undefined> = {};
        for (const rating of savedRatings) {
            initial[rating.interestId] = rating.value;
        }
        return initial;
    });

    const { handleSubmit, setValue } = useRemixForm<RatingsForm>({
        mode: "onSubmit",
        resolver,
        defaultValues: { ratings: [] },
    });
    const actionData = useActionData<typeof action>();
    const submitted = actionData !== undefined && "success" in actionData && actionData.success;

    const allRated = items.length > 0 && items.every((item) => ratings[item.id]);

    function selectValue(itemId: string, value: number) {
        setRatings((prev) => ({ ...prev, [itemId]: value }));
    }

    function handleFormSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        const entries: RatingRequest[] = items.flatMap((item) => {
            const value = ratings[item.id];
            return value ? [{ interestId: item.id, value }] : [];
        });
        setValue("ratings", entries);
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
                        <div className="text-center py-5">
                            <div className="text-lg font-semibold text-[#2b2b28] mb-4">Thanks for rating</div>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between text-sm text-[#4a473f] py-2 border-t border-[#f0eee6]"
                                >
                                    <span>{item.label}</span>
                                    <span className="font-semibold text-[#2b2b28]">{ratings[item.id]} / 5</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Form onSubmit={handleFormSubmit} noValidate method="POST">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#9c8a5f] mb-5">
                                Rate relevance to your preferences
                            </div>

                            {items.map((item) => (
                                <RatingItemRow
                                    key={item.id}
                                    item={item}
                                    value={ratings[item.id]}
                                    onSelect={selectValue}
                                />
                            ))}

                            <button
                                type="submit"
                                disabled={!allRated}
                                className={`w-full h-12 rounded-lg border-none text-[15px] font-semibold transition-colors duration-150 ${
                                    allRated
                                        ? "text-white bg-amber-700 hover:bg-amber-800 cursor-pointer"
                                        : "text-gray-400 bg-gray-100 cursor-not-allowed"
                                }`}
                            >
                                Submit ratings
                            </button>

                            <StatusMessage actionData={actionData} />
                        </Form>
                    )}
                </div>

            </div>
        </div>
    );
}
