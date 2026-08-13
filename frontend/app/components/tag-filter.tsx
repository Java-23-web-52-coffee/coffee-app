import type {TagFilterOption} from "~/utils/models/shop-tag.model";

/**
 * TagFilter Component
 *
 * The tag chips a visitor can filter the search by. Each one is a real
 * checkbox named `interestId`, so the enclosing GET Form submits the selection
 * as repeatable query params alongside `q` — no JavaScript, and the resulting
 * URL is shareable and survives the back button.
 *
 * Selecting several tags narrows rather than widens: the server returns shops
 * carrying every tag checked. The heading says so, because a filter that ANDs
 * when the reader expects OR just looks broken when results vanish.
 *
 * Sibling to ShopTagChip rather than a mode of it — that one is a display-only
 * <li>, this one is an input, and merging them would put form semantics into
 * every card in the grid.
 *
 * @param options - the filterable tags, already deduped and sorted
 * @param selectedInterestIds - which are checked, read from the URL
 *
 * @returns a <fieldset>, or null when nothing is filterable yet
 */

type TagFilterProps = {
    options: TagFilterOption[]
    selectedInterestIds: string[]
}

export function TagFilter(props: TagFilterProps) {
    const {options, selectedInterestIds} = props

    // no shop has earned a tag yet, so there is nothing to filter by
    if(options.length === 0) return null

    return (
        <fieldset
            className="mt-6"
            // re-syncs the boxes when the back button changes the URL, the same
            // reason the search input is keyed on its term
            key={selectedInterestIds.join(',')}
        >
            <legend className="text-sm font-semibold text-gray-900">
                Filter by tag
                <span className="ml-2 font-normal text-gray-500">
                    (shows cafés with every tag you pick)
                </span>
            </legend>

            <ul className="mt-3 flex flex-wrap gap-2">
                {options.map((option) => (
                    <li key={option.interest.id}>
                        <label className="cursor-pointer">
                            <input
                                type="checkbox"
                                name="interestId"
                                value={option.interest.id}
                                defaultChecked={selectedInterestIds.includes(option.interest.id)}
                                className="peer sr-only"
                            />
                            {/* the count is nested, so peer-checked reaches it through a
                                descendant variant on this span — peer-* alone only
                                matches siblings of the checkbox */}
                            <span className="block rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 peer-checked:border-amber-700 peer-checked:bg-amber-700 peer-checked:text-white peer-checked:[&_span]:text-amber-100 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-600 peer-focus-visible:ring-offset-2">
                                {option.interest.category}
                                <span aria-hidden="true" className="ml-1.5 text-amber-700">
                                    · {option.shopCount}
                                </span>
                                <span className="sr-only">, {option.shopCount} cafés</span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </fieldset>
    )
}
