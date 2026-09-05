import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import { Blog } from "../../../../types";

function plainExcerpt(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCategorySlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BlogCard(
  props: (Blog | any) & { carouselSlide?: boolean }
) {
  const { carouselSlide = false, ...blog } = props;
  const auth = useAuth();

  const title = blog.title || blog.name || "";
  const slug = blog.slug || blog.permalink || "";

  if (!slug || slug.trim() === "") {
    console.warn("BlogCard: Missing slug for blog", blog._id || blog.id);
    return null;
  }

  const image = (() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

    if (blog.isNewBlog) {
      const fi: string = blog.featuredImage || "";
      if (!fi) return "";
      if (/^https?:\/\//i.test(fi)) return fi;
      const path = fi.startsWith("/") ? fi : `/${fi}`;
      return `${apiBase}/uploads${path}`;
    }

    const thumb: string = blog.thumbnailImage || "";
    if (!thumb) return "";
    if (/^https?:\/\//i.test(thumb)) return thumb;
    const ip = (auth.ip || "").replace(/\/$/, "");
    const path = thumb.startsWith("/") ? thumb : `/${thumb}`;
    return `${ip}${path}`;
  })();

  const alt =
    blog.featuredImageAlt ||
    blog.blogthumbnailImageAlt ||
    blog.title ||
    blog.name ||
    "Blog Image";
  const imageDescription = blog.featuredImageDescription || undefined;

  let category = blog.blogCategory || "";

  if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
    const cat = blog.categories[0];
    if (cat && typeof cat === "object" && cat.name) {
      category = cat.name;
    } else if (typeof cat === "string") {
      category = cat;
    }
  }

  const cardDate =
    blog.updatedAt ||
    blog.publishDate ||
    blog.blogpublisheddate ||
    blog.createdAt;
  const dateLabel = cardDate
    ? new Date(cardDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const excerptSource =
    blog.blogShortDescription ||
    blog.excerpt ||
    blog.shortDescription ||
    blog.description ||
    "";
  const excerpt = plainExcerpt(
    typeof excerptSource === "string" ? excerptSource : String(excerptSource || "")
  );

  const categoryLabel = (category && String(category).trim()) || "Blog";
  const categorySlug = toCategorySlug(
    (category && String(category).trim()) || "general"
  );

  // Carousel needs Embla flex basis; grid pages should fill the cell.
  const wrapperClass = carouselSlide
    ? "embla__slide mr-3 flex min-w-0 shrink-0 flex-[0_0_calc((100%-0.75rem)/2)] sm:flex-[0_0_calc((100%-1rem)/2)] lg:flex-[0_0_calc((100%-3rem)/3)] px-1"
    : "w-full h-full min-w-0";

  return (
    <div key={blog._id} className={wrapperClass}>
      <Link
        href={`/blogs/${categorySlug}/${slug}`}
        className="block h-full min-w-0 w-full max-w-full"
      >
        <article className="group flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-shadow">
          {/* 1:1 thumbnail — full-bleed, no letterboxing */}
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gray-100">
            <Image
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              src={image || "/default-image.jpg"}
              alt={alt}
              title={imageDescription}
              loading="lazy"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-block max-w-[65%] truncate rounded-md bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-900 sm:text-xs">
                {categoryLabel}
              </span>
              {dateLabel ? (
                <span className="shrink-0 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white sm:text-xs">
                  {dateLabel}
                </span>
              ) : null}
            </div>

            <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-primary sm:min-h-[3rem] sm:text-lg">
              {title}
            </h3>

            <div className="mt-auto flex items-end justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1 hidden sm:block">
                {excerpt ? (
                  <p className="line-clamp-2 text-sm leading-snug text-gray-500">
                    {excerpt}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-400">
                    Read the full article
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-medium text-primary">
                Read more
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}
