import { Router } from 'express'
import { getMyMatchesController } from './matches.controller.ts'
import { isLoggedInController } from '../../utils/controllers/is-logged-in.controller.ts'

const basePath = '/apis/profiles/me/matches' as const
const router = Router()

/**
 * GET /apis/profiles/me/matches?limit=5
 * Shops ranked by how well they fit the signed-in profile's preferences.
 *
 * Guarded like every other authenticated read in this codebase (preferences,
 * ratings): isLoggedInController checks the session AND requires the CSRF token
 * echoed in the Authorization header, which the frontend models already send on
 * their reads. CLAUDE.md describes safe reads as session-only, but the working
 * convention here is stricter and consistency beats the looser reading.
 */
router.route('/')
    .get(isLoggedInController, getMyMatchesController)

export const matchesRoute = { basePath, router }
