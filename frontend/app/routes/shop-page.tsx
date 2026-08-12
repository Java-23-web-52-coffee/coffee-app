import {getShopById, type Shop} from "~/utils/models/shop.model";
import type {Route} from "../../.react-router/types/app/routes/+types/shop-page";
import {getSession} from "~/utils/session.server";
import {Link, redirect, useFetcher} from "react-router";
import {getFavorite} from "~/utils/models/favorite.model";
import {getShopTags, type ShopTag} from "~/utils/models/shop-tag.model";
import {ShopTagChip} from "~/components/shop-tag-chip";

//Our first step is going to be checking to see if the user has liked this coffeeshop
//Step 1: Get logged in user profile id
//Step 2: If user is logged in, get favorite by primary key
//Step 2.1: Create a favorite.model.ts file
//Step 3: If favorite exists, set button to "Unsave" and if not, set button to "Save"


export async function loader({params, request}: Route.LoaderArgs) {
    //     grab session information from cookie jar and parse it
    const cookie = request.headers.get('Cookie')
    const session = await getSession(cookie)

    const profile = session.get('profile')
    const authorization = session.get('authorization')
    if (!authorization || !profile) {
        return redirect('/sign-in')
    }
    const shop: Shop = await getShopById(params.id)
    const favorite = await getFavorite (params.id, profile.id)

    // tags decorate the page rather than carry it, so a failed aggregation
    // falls back to the same empty state a shop with no tags gets instead of
    // taking the whole shop page down with it
    let tags: ShopTag[] = []
    try {
        tags = await getShopTags(params.id)
    } catch (error) {
        console.error(`Failed to load tags for shop ${params.id}:`, error)
    }

    return {shop, favorite, tags}
}


export default function ShopPage({loaderData}: Route.ComponentProps) {
    const {shop, favorite, tags} = loaderData
    const fetcher = useFetcher<{ favorite: boolean }>();

    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        fetcher.submit(null, { method: "post", action: `/shop/${shop.id}/favorite` }).catch((error) => {
            console.error(`Failed to toggle favorite for shop ${shop.id}:`, error);
        });
    };

    const isFavorite = favorite ?? false
    const buttonText = isFavorite ? 'Unfavorite' : 'Favorite'
    return (
        <section className="bg-amber-50">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                    Coffee shop
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
                    {shop.name}
                </h1>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                        <img
                            src={shop.imageUrl}
                            alt={shop.name}
                            className="h-64 w-64 shrink-0 rounded-xl border border-gray-200 object-cover"
                        />

                        <div className="flex-1">
                            <p className="text-gray-600">{shop.address}</p>

                            <div className="mt-6">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                                    Vibe
                                </h2>

                                {tags.length > 0
                                    ? (
                                        <ul className="mt-3 flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <ShopTagChip key={tag.interestId} tag={tag} />
                                            ))}
                                        </ul>
                                    )
                                    : (
                                        <p className="mt-3 text-sm text-gray-600">
                                            No tags yet — be one of the first to rate this café.
                                        </p>
                                    )}
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={toggleFavorite}
                                    className={
                                        isFavorite
                                            ? "rounded-lg border border-amber-700 px-6 py-3 font-semibold text-amber-700 hover:bg-amber-100"
                                            : "rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
                                    }
                                >
                                    {buttonText}
                                </button>

                                {/* The only place in the app that already knows which café
                                    you mean, so this is the entry point to logging a visit.
                                    The visit itself is created when the log form is
                                    submitted, not here. */}
                                <Link
                                    to={`/experience-log/${shop.id}`}
                                    className="rounded-lg border border-amber-700 px-6 py-3 font-semibold text-amber-700 hover:bg-amber-100"
                                >
                                    Log a visit
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}