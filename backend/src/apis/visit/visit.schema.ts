import {z} from "zod/v4";
import {RatingModel, type Rating} from "../ratings/ratings.model.ts";

export const VisitSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id').nullable(),
    shopId: z.uuidv7('Please provide a valid shop id'),
    profileId: z.uuidv7('Please provide a valid profile id'),
    createdAt: z.date(),

})

// A visit and the ratings collected for it are created together, so the
// request carries both: there is no endpoint that adds a rating to an
// existing visit, and a logged experience is never edited afterwards.
// See documentation/experience-log-plan.md.
export const PostVisitSchema = z.object({
    shopId: z.uuidv7('Please provide a valid shop id'),
    ratings: z.array(RatingModel.omit({visitId: true}))
        .min(1, 'Please rate at least one interest')
        // rating's primary key is (visit_id, interest_id), so a repeated
        // interest would abort the whole transaction on a unique violation.
        // Reject it up front with a 400 that names the real problem.
        .refine(
            (ratings) => new Set(ratings.map((rating) => rating.interestId)).size === ratings.length,
            'Each interest may only be rated once per visit'
        ),
})

export type Visit = z.infer<typeof VisitSchema>

export type PostVisitRequest = z.infer<typeof PostVisitSchema>

// what POST /apis/profiles/me/visits returns: the visit plus the rating rows
// that committed with it, so the client never needs a follow-up read
export type LoggedVisit = Visit & { ratings: Rating[] }
