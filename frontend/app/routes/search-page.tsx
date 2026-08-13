import {getAllShops, type Shop} from "~/utils/models/shop.model";
import type { Route } from './+types/search-page';
import {ShopCard} from "~/components/shop-card";
import {
    collectFilterableTags,
    getShopTagListings,
    groupTagsByShopId,
    type ShopTag,
    type TagFilterOption
} from "~/utils/models/shop-tag.model";
import {TagFilter} from "~/components/tag-filter";
import {Form, Link, useNavigation} from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
    // the URL is the source of truth for the search, so the results are shareable and the back button works
    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('q')?.trim() ?? ''
    // repeatable: the server returns shops carrying every tag listed
    const selectedInterestIds = url.searchParams.getAll('interestId')

    const shops: Shop[] = await getAllShops(searchTerm, selectedInterestIds)

    // one unscoped request feeds both jobs: the filter chips, and the tags on
    // each card. Scoping it to the results would make the chip list shrink as
    // you filter, stranding you with no way back. Tags decorate the results,
    // so a failure here leaves plain cards instead of failing the search itself
    let tagsByShopId: Record<string, ShopTag[]> = {}
    let filterOptions: TagFilterOption[] = []
    try {
        const listings = await getShopTagListings()
        // keyed by shop, so listings for shops outside the results are simply never looked up
        tagsByShopId = groupTagsByShopId(listings)
        filterOptions = collectFilterableTags(listings)
    } catch (error) {
        console.error('Failed to load tags for search results:', error)
    }

    return {shops, searchTerm, selectedInterestIds, filterOptions, tagsByShopId}
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
    const { shops, searchTerm, selectedInterestIds, filterOptions, tagsByShopId } = loaderData;
    const navigation = useNavigation()
    // any navigation back to this page is a search — testing for `q` would miss
    // a submit that only changed the tag checkboxes
    const isSearching = navigation.location?.pathname === '/search-page'
    const hasFilters = selectedInterestIds.length > 0

    return (
        <section className="bg-amber-50">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                    Explore cafés
                </p>

                <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
                    Find a coffee shop
                </h1>

                <p className="mt-3 text-gray-600">
                    Browse cafés and search by name or location.
                </p>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                    {/* one Form for both filters, so the term and the checked tags
                        submit together and land in the same URL */}
                    <Form method="get">
                        <label htmlFor="search" className="sr-only">Search</label>
                        <div className="relative max-w-md">
                            <div className="pointer-events-none absolute inset-y-0 flex items-center pl-3">
                                <svg className="h-4 w-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                     width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeWidth="2"
                                          d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
                                </svg>
                            </div>
                            <input
                                type="search"
                                id="search"
                                name="q"
                                // keyed on the term so the box re-syncs when the browser's back button changes the URL
                                key={searchTerm}
                                defaultValue={searchTerm}
                                placeholder="Search by name or location"
                                className="w-full rounded-md border border-gray-400 px-4 py-3 pl-10 text-gray-900 placeholder:text-gray-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600"
                            />
                            <button
                                type="submit"
                                className="absolute inset-y-1.5 right-1.5 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-70"
                                disabled={isSearching}
                            >
                                {isSearching ? 'Searching…' : 'Search'}
                            </button>
                        </div>

                        <TagFilter options={filterOptions} selectedInterestIds={selectedInterestIds} />

                        {hasFilters && (
                            <p className="mt-4">
                                {/* a link, not a reset button: it navigates to the
                                    unfiltered URL, keeping the term the visitor typed */}
                                <Link
                                    to={searchTerm === '' ? '/search-page' : `/search-page?q=${encodeURIComponent(searchTerm)}`}
                                    className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
                                >
                                    Clear tag filters
                                </Link>
                            </p>
                        )}
                    </Form>

                    {shops.length === 0 ? (
                        <p className="mt-8 text-gray-500">
                            {hasFilters
                                ? `No cafés carry ${selectedInterestIds.length === 1 ? 'that tag' : 'all of those tags'}${searchTerm === '' ? '' : ` and match “${searchTerm}”`}. Try removing one.`
                                : searchTerm === ''
                                    ? 'No cafés found.'
                                    : `No cafés match “${searchTerm}”. Try a different name or location.`}
                        </p>
                    ) : (
                        <div className={`mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isSearching ? 'opacity-60' : ''}`}>
                            {shops.map((shop) => (
                                <ShopCard
                                    shop={shop}
                                    tags={shop.id === null ? undefined : tagsByShopId[shop.id]}
                                    key={shop.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
