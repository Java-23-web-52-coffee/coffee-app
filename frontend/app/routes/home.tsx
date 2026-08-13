import { Link } from 'react-router';
import { getMyMatches, type ShopMatch } from '~/utils/models/match.model';
import { MatchCard } from '~/components/match-card';
import { getSession } from '~/utils/session.server';
import type { Route } from './+types/home';


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('Cookie')
  const session = await getSession(cookie)

  const profile = session.get('profile')
  const authorization = session.get('authorization')

  // This is the public landing page, so a missing session renders a signed-out
  // view rather than redirecting — being signed out is not an error here.
  if (!authorization || !profile) {
    return { signedIn: false, matches: [] as ShopMatch[], loadFailed: false }
  }

  try {
    const matches = await getMyMatches(authorization, cookie, 3)
    return { signedIn: true, matches, loadFailed: false }
  } catch (error) {
    // A stale session 401s. Redirecting off the landing page would be hostile,
    // so it degrades to the signed-out view and the nav still offers sign-in.
    if ((error as { status?: number }).status === 401) {
      return { signedIn: false, matches: [] as ShopMatch[], loadFailed: false }
    }
    console.error('Failed to load matches:', error)
    return { signedIn: true, matches: [] as ShopMatch[], loadFailed: true }
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { signedIn, matches, loadFailed } = loaderData
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
                {/* The CTA for the matches section further down this page, so it
                    jumps there rather than navigating away. */}
                <a
                  href="#your-matches"
                  className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
                >
                  Find My Match
                </a>

                <Link
                  to="/search-page"
                  className="rounded-lg border border-amber-700 px-6 py-3 font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Explore Cafés
                </Link>
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


  <section className="bg-white" id="your-matches">
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

      {!signedIn ? (
        <div className="rounded-2xl border border-gray-200 bg-amber-50 p-8">
          <h3 className="text-lg font-bold text-gray-900">
            Sign in to see your matches
          </h3>
          <p className="mt-2 max-w-xl text-gray-600">
            Matches are personal — they come from the preferences you save and
            what other people have rated.
          </p>
          <Link
            to="/sign-in"
            className="mt-6 inline-block rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
          >
            Sign in
          </Link>
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h3 className="text-lg font-bold text-gray-900">
            We couldn&rsquo;t load your matches
          </h3>
          <p className="mt-2 max-w-xl text-gray-600">
            Something went wrong on our end. Please reload the page to try
            again.
          </p>
        </div>
      ) : matches.length === 0 ? (
        /* An empty array has two causes the API cannot tell apart: no
           preferences saved, or no cafe rated yet on anything this profile
           cares about. Given how few ratings exist, the second is currently
           the likelier one — so the copy offers preferences as an action
           without asserting that they are the problem. Telling someone who
           already set their preferences to go set them is the failure mode
           worth avoiding. */
        <div className="rounded-2xl border border-gray-200 bg-amber-50 p-8">
          <h3 className="text-lg font-bold text-gray-900">
            No matches yet
          </h3>
          <p className="mt-2 max-w-xl text-gray-600">
            Matches need two things: preferences you&rsquo;ve saved, and cafés
            people have rated against them. Once both exist, your closest fits
            show up here.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/preferences"
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white hover:bg-amber-800"
            >
              Check your preferences
            </Link>
            <Link
              to="/search-page"
              className="rounded-lg border border-amber-700 px-6 py-3 font-semibold text-amber-700 hover:bg-amber-100"
            >
              Rate a café you&rsquo;ve visited
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id ?? match.name} match={match} />
          ))}
        </div>
      )}
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