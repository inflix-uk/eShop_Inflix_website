"use client";
import React, { Suspense, useEffect, useState } from "react";
import { Blog } from "../../../../types";
import BlogCard from "@/app/components/blogs/BlogCard";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import LoadingBar from "react-top-loading-bar";
import Link from "next/link";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import { useRouter, useSearchParams } from "next/navigation";
import { toCategorySlug } from "./lib/blogCategorySlug";


function BlogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const breadCrumb = [{ name: "Blogs", link: "/blogs", current: true }];
  const [blogs, setBlogs] = useState<Blog[]>([]);

  const [progress, setProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [navbarVariantTestConfig, setNavbarVariantTestConfig] =
    useState<NavbarVariantTestConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(() => {
    const rawPage = Number(searchParams.get("page") || "1");
    return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  });
  const blogsPerPage = 12;

  const loadBlogs = React.useCallback(async () => {
    setProgress(30);
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/blogs", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch blogs (${res.status})`);
      }
      const data = await res.json();
      setBlogs(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setBlogs([]);
      setLoadError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Blog request timed out. Please try again."
          : "Failed to load blogs. Please try again."
      );
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }, []);

  useEffect(() => {
    const rawPage = Number(searchParams.get("page") || "1");
    const nextPage =
      Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    setCurrentPage(nextPage);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    setProgress(30);
    setIsLoading(true);
    setLoadError("");

    fetch("/api/blogs", { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch blogs (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBlogs(Array.isArray(data.data) ? data.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setBlogs([]);
        setLoadError(
          error instanceof DOMException && error.name === "AbortError"
            ? "Blog request timed out. Please try again."
            : "Failed to load blogs. Please try again."
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setIsLoading(false);
          setProgress(100);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
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

  const normalizeCategory = (blog: Blog) => {
    if (blog.blogCategory) return blog.blogCategory;
    if (blog.categories && blog.categories.length > 0) {
      const cat = blog.categories[0];
      if (typeof cat === "object" && cat.name) return cat.name;
      if (typeof cat === "string") return cat;
    }
    return "";
  };

  const normalizeTitle = (blog: Blog) => blog.title || blog.name || "";

  // Filter blogs
  const filteredBlogs = blogs.filter((blog) => {
    const category = normalizeCategory(blog).toLowerCase();
    const title = normalizeTitle(blog).toLowerCase();
    const term = searchTerm.toLowerCase();
    return (
      (selectedCategory === "all" || category === selectedCategory.toLowerCase()) &&
      title.includes(term)
    );
  });

  // Extract categories
  const uniqueCategories = Array.from(
    new Set(
      blogs.map(normalizeCategory).filter((cat) => typeof cat === "string" && cat.trim() !== "")
    )
  );

  const categories = ["all", ...uniqueCategories];
  const categoryCounts = blogs.reduce<Record<string, number>>((acc, blog) => {
    const cat = normalizeCategory(blog).trim().toLowerCase();
    if (!cat) return acc;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Pagination
  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);

  const categoryHref = (category: string) =>
    category === "all" ? "/blogs/" : `/blogs/${toCategorySlug(category)}/`;

  const handleCategoryChange = (category: string) => {
    if (category === selectedCategory) return;
    router.push(categoryHref(category));
  };

  const updatePageInUrl = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`/blogs${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  };

  const goToPage = (nextPage: number) => {
    const maxPage = Math.max(totalPages, 1);
    const normalized = Math.min(Math.max(nextPage, 1), maxPage);
    setCurrentPage(normalized);
    updatePageInUrl(normalized);
  };

  useEffect(() => {
    const maxPage = Math.max(totalPages, 1);
    if (currentPage > maxPage) {
      goToPage(maxPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
      {/* <Nav /> */}
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <BreadCrumb breadcrumb={breadCrumb} />

      <div
        className={`blogs-themed container mx-auto max-w-screen-xl py-10 px-4${
          navbarVariantTestConfig?.variant === "podcast" ? " blogs-podcast" : ""
        }`}
      >
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-8 text-center">
          Explore Our Blogs
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:sticky md:top-24">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Blog Categories</h3>
            <div className="space-y-1">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const href = categoryHref(cat);
                const label =
                  cat === "all"
                    ? "All Categories"
                    : cat
                        .split(" ")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ");
                const count = cat === "all" ? blogs.length : categoryCounts[cat.toLowerCase()] || 0;

                return (
                  <Link
                    key={cat}
                    href={href}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? "blogs-active-chip bg-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-black/10" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0">
            {/* Search + Category Filter (kept same style/placement) */}
            <div className="mb-8 flex max-w-4xl flex-col gap-6 md:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search blogs..."
                  className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 pl-12 shadow-sm transition duration-200 hover:shadow-md focus:border-transparent focus:ring-2 focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="min-w-[200px] cursor-pointer rounded-lg border-2 border-gray-200 bg-white p-4 pr-12 font-medium text-gray-700 shadow-sm transition duration-200 hover:shadow-md focus:border-transparent focus:ring-2 focus:ring-primary"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all"
                      ? "All Categories"
                      : category
                          .split(" ")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Blog Grid */}
            {isLoading ? (
              <div className="py-16 text-center">
                <h3 className="mb-3 text-xl font-medium text-gray-700">Loading blogs...</h3>
                <p className="text-gray-500">Please wait while we fetch the latest posts.</p>
              </div>
            ) : loadError ? (
              <div className="py-16 text-center">
                <h3 className="mb-4 text-2xl font-medium text-gray-700">Unable to load blogs</h3>
                <p className="mb-8 text-gray-500">{loadError}</p>
                <button
                  onClick={() => void loadBlogs()}
                  className="blogs-active-chip inline-flex items-center rounded-md border border-transparent bg-primary px-6 py-3 text-base font-medium shadow-sm"
                >
                  Retry
                </button>
              </div>
            ) : currentBlogs.length === 0 ? (
              <div className="py-16 text-center">
                <h3 className="mb-4 text-2xl font-medium text-gray-700">No blogs found</h3>
                <p className="mb-8 text-gray-500">Try adjusting your search or browse other categories</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    router.push("/blogs/");
                  }}
                  className="blogs-active-chip inline-flex items-center rounded-md border border-transparent bg-primary px-6 py-3 text-base font-medium shadow-sm"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 md:gap-8">
                {currentBlogs
                  .filter((blog: Blog) => {
                    const slug = blog.slug || blog.permalink || "";
                    return slug && slug.trim() !== "";
                  })
                  .map((blog: Blog) => (
                    <div key={blog._id} className="min-w-0">
                      <BlogCard {...blog} />
                    </div>
                  ))}
              </div>
            )}

            {/* Category Pills (kept same behavior) */}
            <div className="mb-8 mt-12 flex flex-wrap justify-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-full px-4 py-2 transition-all ${
                    selectedCategory === cat
                      ? "blogs-active-chip bg-primary shadow-md"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {cat
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </button>
              ))}
            </div>

            {/* Pagination */}
            {currentBlogs.length > 0 && totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center space-x-3">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 rounded-lg border-2 px-5 py-3 disabled:opacity-50 hover:bg-gray-50"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index + 1)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      currentPage === index + 1
                        ? "blogs-active-chip scale-110 bg-primary shadow-lg"
                        : "border-2 hover:bg-gray-50"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-2 rounded-lg border-2 px-5 py-3 disabled:opacity-50 hover:bg-gray-50"
                >
                  <span>Next</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      </>
  );
}

export default function Blogs() {
  return (
    <Suspense fallback={<div className="container mx-auto max-w-screen-xl py-10 px-4" />}>
      <BlogsContent />
    </Suspense>
  );
}
