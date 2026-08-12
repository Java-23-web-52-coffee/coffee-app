import type {ShopTag} from "~/utils/models/shop-tag.model";

/**
 * ShopTagChip Component
 *
 * Renders one derived tag as a chip: the interest's label plus the number of
 * people behind it.
 *
 * The count is not decoration. A tag is an aggregate over other people's
 * ratings, and three people is a very different claim from thirty, so the
 * chip always carries its own evidence — visually as "· 3", and for screen
 * readers as ", from 3 people" so the bare number is never read without
 * context.
 *
 * @param tag - a derived tag: interestId, category, and ratingCount
 * @param size - 'md' (default) for detail pages, 'sm' for dense contexts like ShopCard
 *
 * @returns a single <li> chip, so callers own the surrounding <ul> and its layout
 */

type ShopTagChipProps = {
    tag: ShopTag
    size?: 'sm' | 'md'
}

const SIZE_CLASSES = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
} as const

export function ShopTagChip(props: ShopTagChipProps) {
    const {tag, size = 'md'} = props

    return (
        <li
            className={`rounded-full border border-amber-200 bg-amber-100 font-medium text-amber-900 ${SIZE_CLASSES[size]}`}
        >
            {tag.category}
            <span aria-hidden="true" className="ml-1.5 text-amber-700">
                · {tag.ratingCount}
            </span>
            <span className="sr-only">, from {tag.ratingCount} people</span>
        </li>
    )
}
