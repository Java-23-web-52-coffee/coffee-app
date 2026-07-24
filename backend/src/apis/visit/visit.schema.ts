import {sql} from "../../utils/database.utils.ts";
import {z} from "zod/v4";

export const VisitSchema = z.object({
    id: z.uuidv7('Please provide a valid uuid for id').nullable(),
    shopId: z.uuidv7('Please provide a valid shop id'),
    profileId: z.uuidv7('Please provide a valid profile id'),
    createdAt: z.date(),

})

export const PostVisitSchema = VisitSchema.pick({
    shopId: true
})

export type Visit = z.infer<typeof VisitSchema>

