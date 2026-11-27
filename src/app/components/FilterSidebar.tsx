import { useEffect, useMemo, useState } from "react";
import AccordionItem from "./AccordionItem";
import Slider from "react-slider";
import { StarIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface FilterSidebarProps {
    products: any[]; // Array of product objects
    setFilteredProducts: React.Dispatch<React.SetStateAction<any[]>>; // Function to update filtered products
    selectedSort: { sortFunc: (a: any, b: any) => number }; // Sort function for products
    id?: string; // ID used for filtering
    onClose?: () => void;
}

type FacetKey = "condition" | "storage" | "colour" | "network";

interface ParsedVariant {
    condition: string | null;
    storage: string | null;
    colour: string | null;
    network: string | null;
}

const FACET_KEYS: FacetKey[] = ["condition", "storage", "colour", "network"];

// Number of options shown per facet before "Show more"
const FACET_VISIBLE = 8;

// "128gb", "1tb", "512gb_ssd"
const STORAGE_PART = /^\d+(\.\d+)?(gb|tb)(_[a-z0-9]+)?$/i;

const titleCase = (s: string) =>
    s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

// Parts after storage that aren't the colour. SIM options run to the end of
// the name and may be one part ("single_sim") or several ("dual-sim-physical-sim-esim").
const SIM_WORD = /^(single|dual|triple|physical|nano|e?sim)(_|$)|(^|_)e?sim(_|$)/;
const HAS_SIM = /(^|_)e?sim(_|$)/;
const REGION_PART = /^(uk|global|eu|us|international|spec)(_spec)?$|(^|_)spec$/; // "uk", "uk_spec", "spec"

/**
 * Variant names are hyphen-joined option slugs, with underscores inside a
 * single word: "refurbished-128gb-space-black", "brand_new-256gb-blue",
 * "refurbished-128gb-red-single_sim", "brand_new-256gb-black-uk_spec".
 * Condition comes before storage; colour, SIM and region come after it.
 */
function parseVariantName(name: unknown): ParsedVariant {
    const empty: ParsedVariant = { condition: null, storage: null, colour: null, network: null };
    const parts = String(name || "")
        .toLowerCase()
        .split("-")
        .map((p) => p.trim())
        .filter(Boolean);
    if (!parts.length) return empty;

    const words = (arr: string[]) =>
        arr.map((p) => p.replace(/_/g, " ")).join(" ").trim() || null;

    const storageIdx = parts.findIndex((p) => STORAGE_PART.test(p));
    let condition: string | null;
    let tail: string[];
    if (storageIdx >= 0) {
        condition = storageIdx > 0 ? words(parts.slice(0, storageIdx)) : null;
        tail = parts.slice(storageIdx + 1);
    } else {
        // No storage: "brand-new-..." is still one condition
        const twoWord = parts[0] === "brand" && parts[1] === "new";
        condition = twoWord ? "brand new" : words(parts.slice(0, 1));
        tail = parts.slice(twoWord ? 2 : 1);
    }

    // SIM phrase starts at the first SIM word, if the rest mentions a SIM
    const simStart = tail.findIndex(
        (p, i) => SIM_WORD.test(p) && tail.slice(i).some((q) => HAS_SIM.test(q))
    );
    const colourTail = simStart >= 0 ? tail.slice(0, simStart) : tail;
    // Only the SIM words themselves ("dual sim physical dual sim"), not
    // trailing extras such as "enterprise edition 12gb ram"
    const simParts: string[] = [];
    if (simStart >= 0) {
        for (const p of tail.slice(simStart)) {
            if (SIM_WORD.test(p) || p === "unconfirmed") simParts.push(p);
            else break;
        }
    }
    const colourParts = colourTail.filter((p) => !REGION_PART.test(p));

    return {
        condition,
        storage: storageIdx >= 0 ? parts[storageIdx].replace(/_/g, " ") : null,
        colour: words(colourParts),
        network: words(simParts),
    };
}

// Sort storage by real size: 64GB < 128GB < 1TB
const storageBytes = (s: string) => {
    const m = s.match(/^(\d+(?:\.\d+)?)(gb|tb)/i);
    if (!m) return Number.MAX_SAFE_INTEGER;
    return Number(m[1]) * (m[2].toLowerCase() === "tb" ? 1024 : 1);
};

const facetLabel = (key: FacetKey, value: string) =>
    key === "storage" ? value.toUpperCase().replace(/(\d)(GB|TB)/, "$1 $2") : titleCase(value);

// Price shown on the card (sale price when there is one)
function productPrice(product: any): { list: number; sale: number } {
    const list = Number(product.minPrice) || Number(product.originalPrice);
    const sale = Number(product.minSalePrice) || Number(product.price) || list;
    return { list, sale };
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
    products,
    setFilteredProducts,
    selectedSort,
    onClose,
}) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        price: true,
        condition: true,
        storage: true,
        colour: true,
        network: true,
        discount: true,
        ratings: true,
    });
    const [showAll, setShowAll] = useState<Record<string, boolean>>({});
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [discountValues, setDiscountValues] = useState<[number, number]>([0, 100]);
    const [selected, setSelected] = useState<Record<FacetKey, string[]>>({
        condition: [],
        storage: [],
        colour: [],
        network: [],
    });
    // Typed values vs. the range actually applied (Apply button)
    const [priceFrom, setPriceFrom] = useState("");
    const [priceTo, setPriceTo] = useState("");
    const [priceRange, setPriceRange] = useState<[number | null, number | null]>([null, null]);

    const toggleSection = (section: string) =>
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

    const toggleRating = (rating: number) =>
        setSelectedRatings((prev) =>
            prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
        );

    const toggleFacet = (key: FacetKey, value: string) =>
        setSelected((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((v) => v !== value)
                : [...prev[key], value],
        }));

    // Parse every product's variants once. The API sends clean `facets` per variant
    // (read from the variant's own colour / storage / SIM fields); guessing from
    // the variant name is only the fallback for older API responses.
    const parsedByProduct = useMemo(() => {
        const fromFacets = (f: any): ParsedVariant => {
            const clean = (s: unknown) => {
                const t = String(s ?? "").trim().toLowerCase();
                return t || null;
            };
            return {
                condition: clean(f.condition),
                // "128 GB" -> "128gb" so sizes sort and label like the name parser
                storage: clean(f.storage)?.replace(/(\d)\s+(gb|tb)\b/, "$1$2") ?? null,
                colour: clean(f.colour),
                network: clean(f.network),
            };
        };
        const map = new Map<any, ParsedVariant[]>();
        products.forEach((product) => {
            const variants = Array.isArray(product?.variantValues) ? product.variantValues : [];
            map.set(
                product,
                variants.map((v: any) =>
                    v?.facets && typeof v.facets === "object" ? fromFacets(v.facets) : parseVariantName(v?.name)
                )
            );
        });
        return map;
    }, [products]);

    // Options per facet with the number of products that offer each one
    const facets = useMemo(() => {
        const counts: Record<FacetKey, Map<string, number>> = {
            condition: new Map(),
            storage: new Map(),
            colour: new Map(),
            network: new Map(),
        };
        products.forEach((product) => {
            const parsed = parsedByProduct.get(product) || [];
            FACET_KEYS.forEach((key) => {
                const values = new Set(parsed.map((p) => p[key]).filter(Boolean) as string[]);
                values.forEach((v) => counts[key].set(v, (counts[key].get(v) || 0) + 1));
            });
        });
        const toList = (key: FacetKey) => {
            const list = Array.from(counts[key].entries()).map(([value, count]) => ({ value, count }));
            return key === "storage"
                ? list.sort((a, b) => storageBytes(a.value) - storageBytes(b.value))
                : list.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
        };
        return {
            condition: toList("condition"),
            storage: toList("storage"),
            colour: toList("colour"),
            network: toList("network"),
        };
    }, [products, parsedByProduct]);

    const hasActiveFilters =
        FACET_KEYS.some((key) => selected[key].length > 0) ||
        selectedRatings.length > 0 ||
        priceRange[0] !== null ||
        priceRange[1] !== null ||
        discountValues[0] !== 0 ||
        discountValues[1] !== 100;

    const clearAll = () => {
        setSelected({ condition: [], storage: [], colour: [], network: [] });
        setSelectedRatings([]);
        setDiscountValues([0, 100]);
        setPriceFrom("");
        setPriceTo("");
        setPriceRange([null, null]);
    };

    const applyPrice = () => {
        const from = priceFrom.trim() === "" ? null : Number(priceFrom);
        const to = priceTo.trim() === "" ? null : Number(priceTo);
        const safeFrom = from !== null && Number.isFinite(from) && from >= 0 ? from : null;
        const safeTo = to !== null && Number.isFinite(to) && to >= 0 ? to : null;
        // Swap if entered the wrong way round
        if (safeFrom !== null && safeTo !== null && safeFrom > safeTo) {
            setPriceRange([safeTo, safeFrom]);
        } else {
            setPriceRange([safeFrom, safeTo]);
        }
    };

    const resetPrice = () => {
        setPriceFrom("");
        setPriceTo("");
        setPriceRange([null, null]);
    };

    useEffect(() => {
        const filtered = products.filter((product) => {
            // Price: a product with odd/missing numbers never vanishes
            const { list, sale } = productPrice(product);
            const matchesPrice =
                !Number.isFinite(sale) ||
                ((priceRange[0] === null || sale >= priceRange[0]) &&
                    (priceRange[1] === null || sale <= priceRange[1]));

            // Discount percentage (0–100; no discount when unknown)
            const rawDiscount = Math.round(((list - sale) / list) * 100);
            const discount = Number.isFinite(rawDiscount)
                ? Math.min(100, Math.max(0, rawDiscount))
                : 0;
            const matchesDiscount = discount >= discountValues[0] && discount <= discountValues[1];

            const matchesRating =
                selectedRatings.length === 0 ||
                selectedRatings.includes(Math.floor(product.averageRating));

            // Condition / storage / colour / network: one variant must satisfy
            // every selected facet (so "128 GB" + "Gold" means a 128GB gold variant)
            const anyVariantFacet = FACET_KEYS.some((key) => selected[key].length > 0);
            const matchesVariant =
                !anyVariantFacet ||
                (parsedByProduct.get(product) || []).some((p) =>
                    FACET_KEYS.every((key) => {
                        if (!selected[key].length) return true;
                        const value = p[key];
                        return !!value && selected[key].includes(value);
                    })
                );

            return matchesPrice && matchesDiscount && matchesRating && matchesVariant;
        });

        const sorted = [...filtered].sort(selectedSort.sortFunc);
        setFilteredProducts(sorted);
    }, [
        priceRange,
        discountValues,
        selectedRatings,
        selected,
        products,
        parsedByProduct,
        selectedSort,
        setFilteredProducts,
    ]);

    const facetSection = (key: FacetKey, title: string) => {
        const options = facets[key];
        if (!options.length) return null;
        const expanded = !!showAll[key];
        const visible = expanded ? options : options.slice(0, FACET_VISIBLE);
        return (
            <AccordionItem
                key={key}
                title={title}
                headingLevel={false}
                isOpen={openSections[key]}
                onClick={() => toggleSection(key)}
            >
                <div className="space-y-2 pb-1">
                    {visible.map(({ value, count }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 rounded-sm text-primary focus:ring-0"
                                checked={selected[key].includes(value)}
                                onChange={() => toggleFacet(key, value)}
                            />
                            <span>
                                {facetLabel(key, value)}{" "}
                                <span className="text-gray-500">({count})</span>
                            </span>
                        </label>
                    ))}
                    {options.length > FACET_VISIBLE && (
                        <button
                            type="button"
                            className="text-sm font-medium text-primary hover:underline"
                            onClick={() => setShowAll((prev) => ({ ...prev, [key]: !expanded }))}
                        >
                            {expanded ? "Show less" : "Show more"}
                        </button>
                    )}
                </div>
            </AccordionItem>
        );
    };

    return (
        <>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <span className="text-base font-semibold text-gray-900">Filter by</span>
                <div className="flex items-center gap-3">
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Clear all
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            aria-label="Close filters"
                        >
                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            <AccordionItem
                title="Price Range"
                headingLevel={false}
                isOpen={openSections.price}
                onClick={() => toggleSection("price")}
            >
                <form
                    className="pb-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyPrice();
                    }}
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            placeholder="From"
                            aria-label="Minimum price"
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value)}
                            className="w-full min-w-0 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-primary focus:ring-0"
                        />
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            placeholder="To"
                            aria-label="Maximum price"
                            value={priceTo}
                            onChange={(e) => setPriceTo(e.target.value)}
                            className="w-full min-w-0 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-primary focus:ring-0"
                        />
                        <button
                            type="submit"
                            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                            Apply
                        </button>
                    </div>
                    {(priceRange[0] !== null || priceRange[1] !== null || priceFrom || priceTo) && (
                        <button
                            type="button"
                            onClick={resetPrice}
                            className="mt-2 w-full text-center text-sm font-medium text-primary hover:underline"
                        >
                            Reset
                        </button>
                    )}
                </form>
            </AccordionItem>

            {facetSection("condition", "Condition")}
            {facetSection("storage", "Built-in Memory")}
            {facetSection("colour", "Colour")}
            {facetSection("network", "Network")}

            <AccordionItem
                title="Discount"
                headingLevel={false}
                isOpen={openSections.discount}
                onClick={() => toggleSection("discount")}
            >
                <div className="relative w-full my-5">
                    <Slider
                        className="w-full h-2 bg-primary rounded-full"
                        thumbClassName="relative w-4 h-4 bg-white border-2 border-gray-400 rounded-full shadow cursor-pointer top-[-4px]"
                        trackClassName="bg-gray-700 rounded-full"
                        value={discountValues}
                        min={0}
                        max={100}
                        onChange={(newValues) => setDiscountValues(newValues as [number, number])}
                        renderTrack={({ key, ...trackProps }) => (
                            <div key={key} {...trackProps} />
                        )}
                        renderThumb={({ key, ...thumbProps }, state) => (
                            <div key={key} {...thumbProps}>
                                <div
                                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-700"
                                    style={{ minWidth: "30px" }}
                                >
                                    {state.valueNow}%
                                </div>
                            </div>
                        )}
                    />
                </div>
            </AccordionItem>

            <AccordionItem
                title="Ratings"
                headingLevel={false}
                isOpen={openSections.ratings}
                onClick={() => toggleSection("ratings")}
            >
                {[5, 4, 3, 2, 1].map((rating) => (
                    <div className="mb-2" key={rating}>
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-gray-400 focus:ring-0 rounded-sm"
                                onChange={() => toggleRating(rating)}
                                checked={selectedRatings.includes(rating)}
                            />
                            <span className="py-1 ms-2 text-sm font-regular text-yellow-400 mr-1 flex flex-row items-center">
                                {[...Array(5)].map((_, index) => (
                                    <StarIcon
                                        key={index}
                                        className={`h-4 w-4 flex-shrink-0 ${index < rating ? "text-amber-300" : "text-gray-300"
                                            }`}
                                        aria-hidden="true"
                                    />
                                ))}
                            </span>
                            <span className="ml-2 text-gray-800">({rating} Stars)</span>
                        </label>
                    </div>
                ))}
            </AccordionItem>
        </>
    );
};

export default FilterSidebar;
