import {getAllShops, type Shop} from "~/utils/models/shop.model";
import type { Route } from './+types/search-page';
import {ShopCard} from "~/components/shop-card";
import {Form, useNavigation} from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
    // the URL is the source of truth for the search, so the results are shareable and the back button works
    const searchTerm = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    const shops: Shop[] = await getAllShops(searchTerm)
    return {shops, searchTerm}
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
    const { shops, searchTerm } = loaderData;
    const navigation = useNavigation()
    const isSearching = navigation.location !== undefined
        && new URLSearchParams(navigation.location.search).has('q')

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
                    <Form method="get" className="max-w-md">
                        <label htmlFor="search" className="sr-only">Search</label>
                        <div className="relative">
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
                    </Form>

                    {shops.length === 0 ? (
                        <p className="mt-8 text-gray-500">
                            {searchTerm === ''
                                ? 'No cafés found.'
                                : `No cafés match “${searchTerm}”. Try a different name or location.`}
                        </p>
                    ) : (
                        <div className={`mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isSearching ? 'opacity-60' : ''}`}>
                            {shops.map((shop) => <ShopCard shop={shop} key={shop.id}/>)}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
