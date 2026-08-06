import { redirect } from "react-router";
import { destroySession, getSession } from "~/utils/session.server";
import { postSignOut } from "~/utils/models/sign-out.model";
import type { Route } from './+types/sign-out'

export async function action({ request }: Route.ActionArgs) {
    const cookie = request.headers.get("Cookie")
    const session = await getSession(cookie)

    // Always clear the local session and redirect home, even if the backend
    // call fails — a user should never be stuck "signed in" locally just
    // because the backend was briefly unreachable.
    const { headers } = await postSignOut(cookie)
    const expressSessionCookie = headers.get('Set-Cookie')

    const responseHeaders = new Headers()
    responseHeaders.append('Set-Cookie', await destroySession(session))
    if (expressSessionCookie) {
        responseHeaders.append('Set-Cookie', expressSessionCookie)
    }

    return redirect('/', { headers: responseHeaders })
}
