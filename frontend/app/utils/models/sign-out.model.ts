import type { Status } from "~/utils/interfaces/Status";

// signs the profile out on the backend: destroys the express/Redis session
// tied to the forwarded Cookie header and clears its connect.sid cookie.
// Mirrors postSignIn's {result, headers} shape so the caller can forward
// any Set-Cookie header the backend sends back.

export async function postSignOut(cookie?: string | null): Promise<{ result: Status, headers: Headers }> {
    try {
        const headers: HeadersInit = {}
        if (cookie) {
            headers['Cookie'] = cookie
        }

        const response = await fetch(`${process.env.REST_API_URL}/sign-out`, {
            method: 'POST',
            headers,
            credentials: 'include',
        })

        if (response.status === 204) {
            return { result: { status: 204, data: null, message: null }, headers: response.headers }
        }

        return {
            result: { status: response.status, data: null, message: 'Failed to sign out' },
            headers: response.headers,
        }
    } catch (error) {
        console.error('sign-out request failed to reach the server', error)
        return {
            result: {
                status: 503,
                data: null,
                message: 'Unable to reach the server. Please check your connection and try again.',
            },
            headers: new Headers(),
        }
    }
}
