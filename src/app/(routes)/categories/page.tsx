"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import { resolveCategoryImageSrc } from "@/lib/categoryBannerSrc";
import { Blog, Category } from "../../../../types";

function apiBaseUrl(): string {
  return String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

function normalizeBlogCategory(blog: Blog): string {
  if (blog.blogCategory) return String(blog.blogCategory);
  if (blog.categories && blog.categories.length > 0) {
    const cat = blog.categories[0];
    if (typeof cat === "object" && cat && "name" in cat && (cat as { name?: string }).name) {
      return String((cat as { name: string }).name);
    }
    if (typeof cat === "string") return cat;
  }
  return "";
}

function blogCategoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

function formatBlogCategoryLabel(name: string): string {
  return name
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type BlogCategoryChip = { label: string; slug: string; count: number };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [blogCategories, setBlogCategories] = useState<BlogCategoryChip[]>([]);
  const [blogCategoriesLoading, setBlogCategoriesLoading] = useState(true);
  const [navbarVariantTestConfig, setNavbarVariantTestConfig] =
    useState<NavbarVariantTestConfig | null>(null);

  useEffect(() => {
    const base = apiBaseUrl();
    if (!base) {
      setIsLoading(false);
      return;
    }
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${base}/get/product/category`);
        const data = await response.json();
        setCategories(data.productCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCategories();
  }, []);

  useEffect(() => {
    const base = apiBaseUrl();
    if (!base) {
      setBlogCategoriesLoading(false);
      return;
    }
    let cancelled = false;
    const fetchBlogCategories = async () => {
      setBlogCategoriesLoading(true);
      try {
        const res = await fetch(`${base}/get/blog`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const blogs: Blog[] = Array.isArray(data.data) ? data.data : [];
        const counts: Record<string, number> = {};
        const labelsByKey = new Map<string, string>();
        for (const blog of blogs) {
          const raw = normalizeBlogCategory(blog).trim();
          if (!raw) continue;
          const key = raw.toLowerCase();
          counts[key] = (counts[key] || 0) + 1;
          if (!labelsByKey.has(key)) labelsByKey.set(key, raw);
        }
        const items: BlogCategoryChip[] = Object.keys(counts)
          .map((key) => ({
            label: labelsByKey.get(key) || key,
            slug: blogCategoryToSlug(labelsByKey.get(key) || key),
            count: counts[key],
          }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
        if (!cancelled) setBlogCategories(items);
      } catch (e) {
        console.error("Error fetching blog categories:", e);
        if (!cancelled) setBlogCategories([]);
      } finally {
        if (!cancelled) setBlogCategoriesLoading(false);
      }
    };
    void fetchBlogCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadNavbarVariantConfig = async () => {
      const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
      if (!base) return;
      try {
        const res = await fetch(`${base}/navbar-variant-test/public`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setNavbarVariantTestConfig(json?.data?.config || null);
        }
      } catch {
        if (!cancelled) setNavbarVariantTestConfig(null);
      }
    };
    void loadNavbarVariantConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <div className="max-w-7xl mx-auto p-3">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {(blogCategoriesLoading || blogCategories.length > 0) && (
            <section
              className="mb-16 sm:mb-20"
              aria-labelledby="blog-categories-heading"
            >
              <header className="mb-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  From our blog
                </p>
                <h2
                  id="blog-categories-heading"
                  className="mt-2 text-3xl font-extrabold text-gray-700 sm:text-4xl md:text-5xl"
                >
                  Blog <span className="text-primary">categories</span>
                </h2>
                <p className="mt-3 max-w-xl mx-auto text-base text-gray-500 sm:text-lg">
                  Browse posts by topic — each card opens that category on the blog.
                </p>
                <div className="mt-6">
                  <Link
                    href="/blogs/"
                    className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-white px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    View all blogs
                  </Link>
                </div>
              </header>

              {blogCategoriesLoading ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
                  {[...Array(4)].map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-lg bg-white shadow-md"
                    >
                      <div className="animate-pulse">
                        <div className="h-48 bg-gray-200" />
                        <div className="p-6">
                          <div className="mb-2 h-7 w-2/3 rounded bg-gray-200" />
                          <div className="h-4 w-1/2 rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
                  {blogCategories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/blogs/${c.slug}/`}
                      className="group"
                    >
                      <div className="overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-primary/20 via-white to-gray-100">
                          <BookOpen
                            className="h-20 w-20 text-primary/35 transition-colors group-hover:text-primary/55"
                            strokeWidth={1.25}
                            aria-hidden
                          />
                          <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-gray-100">
                            {c.count}{" "}
                            {c.count === 1 ? "post" : "posts"}
                          </div>
                          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                        </div>
                        <div className="p-6">
                          <h3 className="mb-2 text-xl font-semibold text-gray-900 transition-colors group-hover:text-primary">
                            {formatBlogCategoryLabel(c.label)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Read guides and articles in{" "}
                            {formatBlogCategoryLabel(c.label)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          <div
            className={`${blogCategoriesLoading || blogCategories.length > 0 ? "border-t border-gray-200 pt-16 sm:pt-20" : ""}`}
          >
            <header className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Shop products
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-gray-600 sm:text-4xl md:text-5xl lg:text-6xl">
                Explore with <span className="text-primary">categories</span>
              </h2>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Discover a wide range of products across various categories.
              </p>
            </header>

          <div className="relative max-w-lg mx-auto mb-12">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3 text-base placeholder-gray-500 border border-transparent rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ring-2 ring-gray-200"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="animate-pulse">
                    <div className="h-48 bg-gray-300"></div>
                    <div className="p-4">
                      <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredCategories.map((category) => {
                const bannerSrc = resolveCategoryImageSrc(category.bannerImage);
                return (
                  <Link
                    href={`/categories/${category.name.toLowerCase()}/`}
                    key={category._id}
                    className="group"
                  >
                    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                      <div className="relative h-48 bg-gray-200">
                        {bannerSrc ? (
                          <Image
                            src={bannerSrc}
                            alt={category.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-sm text-gray-500"
                            aria-hidden
                          >
                            No image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
                      </div>
                      <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300">
                          {category.name}
                        </h2>
                        <p className="text-gray-600 text-sm">
                          Explore our {category.name} collection
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!isLoading && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No categories found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {`Try adjusting your search or filter to find what you're looking
                for.`}
              </p>
            </div>
          )}
          </div>
        </main>
      </div>
    </>
  );
}
