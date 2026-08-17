import {useState} from "react";
import {useNavigate, useSearchParams} from "react-router";

/**
 * NearMeButton Component
 *
 * Asks the browser for the visitor's position and puts it in the URL, which is
 * what makes the search nearest-first. The URL stays the source of truth here
 * for the same reason `q` and `interestId` live there — the result is shareable
 * and the back button undoes the sort.
 *
 * Deliberately NOT fired on page load. A geolocation prompt that appears before
 * the visitor has asked for anything is how a site gets its permission
 * permanently denied, and the unlocated page is perfectly useful on its own.
 *
 * This is the one piece of the feature that needs JavaScript — `navigator.
 * geolocation` has no markup equivalent — so it renders as a button that simply
 * does nothing until hydrated, leaving the plain search Form around it intact.
 *
 * @param isLocated whether the URL already carries a position, which swaps the label
 */

// ~110 m, far finer than anyone needs to order cafés, and it keeps a URL that
// gets shared, bookmarked, or written to a server log from carrying the
// visitor's doorstep
const COORDINATE_PRECISION = 3

// the browser will otherwise wait on a cold GPS fix indefinitely, leaving the
// button stuck on "Locating…" with nothing to tell the visitor
const GEOLOCATION_TIMEOUT_MS = 10000

// a fix from the last few minutes is more than good enough at this precision,
// and skips the wait entirely on a second click
const GEOLOCATION_MAX_AGE_MS = 300000

type LocateState = 'idle' | 'locating' | 'error'

export function NearMeButton({isLocated}: { isLocated: boolean }) {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [state, setState] = useState<LocateState>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    function locate() {
        // undefined on a plain http:// origin that is not localhost, where the
        // browser withholds the API entirely rather than prompting
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setState('error')
            setErrorMessage('This browser cannot share your location. Try searching by name or neighborhood instead.')
            return
        }

        setState('locating')
        navigator.geolocation.getCurrentPosition(
            position => {
                // built from the current params, so a term already typed and any
                // checked tags survive being sorted by distance
                const nextParams = new URLSearchParams(searchParams)
                nextParams.set('lat', position.coords.latitude.toFixed(COORDINATE_PRECISION))
                nextParams.set('lng', position.coords.longitude.toFixed(COORDINATE_PRECISION))
                setState('idle')
                navigate(`/search-page?${nextParams.toString()}`)
            },
            error => {
                setState('error')
                setErrorMessage(
                    error.code === error.PERMISSION_DENIED
                        ? 'Location is blocked for this site. You can allow it in your browser settings, or search by name or neighborhood.'
                        : error.code === error.TIMEOUT
                            ? 'Locating you took too long. Try again, or search by name or neighborhood.'
                            : 'Your location is not available right now. Try searching by name or neighborhood.'
                )
            },
            {timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS}
        )
    }

    return (
        <div>
            <button
                // type="button" matters: this sits inside the search Form, and a
                // default submit button would fire a GET navigation on click
                type="button"
                onClick={locate}
                disabled={state === 'locating'}
                className="inline-flex items-center gap-2 rounded-md border border-amber-700 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-70"
            >
                <svg className="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                     fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 21c4-4.5 6-7.75 6-10.5a6 6 0 1 0-12 0C6 13.25 8 16.5 12 21Z"/>
                    <circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {state === 'locating'
                    ? 'Locating…'
                    : isLocated
                        ? 'Update my location'
                        : 'Use my location'}
            </button>

            {state === 'error' && (
                // role="alert" so the failure reaches a screen reader: the button
                // label snaps back to its resting state and would otherwise be
                // the only clue that anything happened
                <p role="alert" className="mt-2 max-w-md text-sm text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
