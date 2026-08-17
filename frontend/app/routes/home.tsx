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
        <section className="bg-mocha-50">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-8 md:grid-cols-2 md:py-10">

            <div className="text-center md:text-left">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-mocha-700">
                Personalized cafe recommendations
              </p>

              <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-5xl">
                Find the perfect cafe for today.
              </h1>

              <p className="mx-auto max-w-xl text-base leading-7 text-gray-600 md:mx-0">
                BrewMatch helps you discover coffee shops based on what matters
                most to you, including WiFi, noise level, seating, outlets, food,
                and atmosphere.
              </p>
            </div>

            <div className="flex justify-center">
              <img
                src="/homepagecoffeeshop.jpg"
                alt="A busy café interior lit by hanging lamps, with a glowing COFFEE sign above the counter"
                className="h-64 w-full max-w-lg rounded-3xl object-cover"
              />
            </div>

          </div>
        </section>
      </main>


  <section className="bg-white" id="your-matches">
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-20">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-mocha-700">
          Personalized for you
        </p>

        <h2 className="mt-2 text-4xl font-bold text-gray-900 md:text-5xl">
          Your top matches
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-lg text-gray-600">
          Coffee shops that match your current preferences.
        </p>
      </div>

      {!signedIn ? (
        <div className="rounded-2xl border border-gray-200 bg-mocha-50 p-8">
          <h3 className="text-lg font-bold text-gray-900">
            Sign in to see your matches
          </h3>
          <p className="mt-2 max-w-xl text-gray-600">
            Matches are personal — they come from the preferences you save and
            what other people have rated.
          </p>
          <Link
            to="/sign-in"
            className="mt-6 inline-block rounded-lg bg-mocha-700 px-6 py-3 font-semibold text-white hover:bg-mocha-800"
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
        <div className="rounded-2xl border border-gray-200 bg-mocha-50 p-8">
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
              className="rounded-lg bg-mocha-700 px-6 py-3 font-semibold text-white hover:bg-mocha-800"
            >
              Check your preferences
            </Link>
            <Link
              to="/search-page"
              className="rounded-lg border border-mocha-700 px-6 py-3 font-semibold text-mocha-700 hover:bg-mocha-100"
            >
              Rate a café you&rsquo;ve visited
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id ?? match.name} match={match} />
          ))}
        </div>
      )}
    </div>
  </section>


      </>
  );
}