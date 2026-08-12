import { Link } from 'react-router';
import type { Route } from './+types/home';


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
      <>
      <main>
        <section className="bg-amber-50">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">
                Personalized cafe recommendations
              </p>

              <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
                Find the perfect cafe for today.
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
                BrewMatch helps you discover coffee shops based on what matters
                most to you, including WiFi, noise level, seating, outlets, food,
                and atmosphere.
              </p>

              <div className="flex flex-wrap gap-4">
                <button className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800">
                  Find My Match
                </button>

                <button className="rounded-lg border border-amber-700 px-6 py-3 font-semibold text-amber-700 hover:bg-amber-100">
                  Explore Cafés
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex h-80 w-full max-w-lg items-center justify-center rounded-3xl bg-amber-100 text-gray-500">
                Coffee shop image
              </div>
            </div>

          </div>
        </section>
      </main>


  <section className="bg-white">
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Personalized for you
        </p>

        <h2 className="mt-2 text-3xl font-bold text-gray-900">
          Your top matches
        </h2>

        <p className="mt-3 text-gray-600">
          Coffee shops that match your current preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-48 bg-gray-200"></div>

          <div className="p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                Little Bear Coffee
              </h3>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              94% Match
            </span>
            </div>

            <p className="mb-5 text-gray-600">
              Quiet atmosphere, reliable WiFi, and plenty of outlets.
            </p>

            <button className="font-semibold text-amber-700 hover:text-amber-900">
              View Details
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-48 bg-gray-200"></div>

          <div className="p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                Desert Bloom Café
              </h3>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              90% Match
            </span>
            </div>

            <p className="mb-5 text-gray-600">
              Outdoor seating, relaxed atmosphere, and great food.
            </p>

            <button className="font-semibold text-amber-700 hover:text-amber-900">
              View Details
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-48 bg-gray-200"></div>

          <div className="p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">
                Common Ground
              </h3>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              87% Match
            </span>
            </div>

            <p className="mb-5 text-gray-600">
              Comfortable seating, calm music, and a welcoming vibe.
            </p>

            <button className="font-semibold text-amber-700 hover:text-amber-900">
              View Details
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>


        <section className="bg-amber-50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Quick actions
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                What would you like to do?
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <button className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900">
                  Update Preferences
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Change what matters most in your café search.
                </p>
              </button>

              <button className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900">
                  Explore Cafés
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Browse coffee shops and discover new places.
                </p>
              </button>

              {/* Logging a visit needs a café, and this page doesn't know which
                  one — so the card routes through search rather than pretending
                  to start the log. Private notes are not a feature; the copy no
                  longer claims they are. */}
              <Link
                to="/search-page"
                className="block rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-gray-900">
                  Log a Visit
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Find the café you went to and rate how it went.
                </p>
              </Link>

              <button className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900">
                  Saved Places
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  View cafés you want to visit or return to.
                </p>
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16">

            <div className="rounded-3xl border border-gray-200 bg-amber-50 p-10">

              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Your Coffee Style
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                Current Preferences
              </h2>

              <p className="mt-4 max-w-2xl text-gray-600">
                These preferences are used to personalize your
                coffee shop recommendations.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  ☕ Quiet Environment
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  📶 Reliable WiFi
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  🌿 Outdoor Seating
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  🔌 Plenty of Outlets
                </div>

              </div>

              <button className="mt-10 rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800">
                Edit Preferences
              </button>

            </div>

          </div>
        </section>




      </>
  );
}