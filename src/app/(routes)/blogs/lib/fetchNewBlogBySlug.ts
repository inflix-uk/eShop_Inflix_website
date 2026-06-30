import { resolveCmsApiBase } from "@/app/lib/cmsApiBase";
import { cmsPublicFetchInit, cmsLivePublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
  isCmsUnreachableFetchError,
} from "@/app/lib/cmsTimedFetch";

export type NewBlogPost = Record<string, unknown>;

/** Fetch a new-blog post by slug (admin CMS model). */
export async function fetchNewBlogBySlug(
  slug: string,
  options?: { live?: boolean }
): Promise<NewBlogPost | null> {
  const base = resolveCmsApiBase();
  if (!base || !slug) return null;

  const cacheInit =
    options?.live === false
      ? cmsPublicFetchInit()
      : cmsLivePublicFetchInit();

  try {
    const res = await cmsTimedFetch(
      `${base}/newblog/blog/postsBySlugWithoutCache/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        ...cacheInit,
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      success?: boolean;
      data?: NewBlogPost;
    };
    if (!data?.success || !data?.data) return null;

    const post = data.data;
    const isDev = process.env.NODE_ENV === "development";
    const status = post.publishStatus;
    if (status && status !== "published" && !isDev) {
      return null;
    }

    return post;
  } catch (err) {
    if (!isCmsFetchAbortError(err) && !isCmsUnreachableFetchError(err)) {
      console.error("[fetchNewBlogBySlug]", slug, err);
    }
    return null;
  }
}
