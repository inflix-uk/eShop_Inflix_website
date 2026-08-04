"use client";

import TopBar from "@/app/topbar/page";
import React, { useEffect, useState } from "react";
import { Blog } from "../../../../types";
import BlogCard from "@/app/components/blogs/BlogCard";
import Nav from "@/app/components/navbar/Nav";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import LoadingBar from "react-top-loading-bar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toCategorySlug } from "./lib/blogCategorySlug";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

type CategoryBlogsClientProps = {
  categorySlug: string;
  /** Preloaded on the server so the client does not refetch (avoids Strict Mode abort races). */
  initialBlogs?: Blog[];
};

export default function CategoryBlogsClient({
  categorySlug,
  initialBlogs,
}: CategoryBlogsClientProps) {
  const router = useRouter();
  const formattedSlugCategory = formatCategoryName(categorySlug);

  const [progress, setProgress] = useState<number>(initialBlogs ? 100 : 0);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 12;

  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs ?? []);
  const [isLoading, setIsLoading] = useState(initialBlogs === undefined);
  const [loadError, setLoadError] = useState("");
  const [navbarVariantTestConfig, setNavbarVariantTestConfig] =
    useState<NavbarVariantTestConfig | null>(null);

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
    } catch {
      setBlogs([]);
      setLoadError("Failed to load blogs. Please try again.");
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }, []);

  useEffect(() => {
    if (initialBlogs !== undefined) {
      return;
    }
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
        const isTimeout =
          error instanceof DOMException && error.name === "AbortError";
        setLoadError(
          isTimeout
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
  }, [initialBlogs]);

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

  function formatCategoryName(categoryName: string | undefined | null): string {
    if (!categoryName || typeof categoryName !== "string") return "All Categories";
    return categoryName
      .replace(/[-_]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const [actualCategory, setActualCategory] = useState<string>(formattedSlugCategory);

  useEffect(() => {
    if (blogs.length > 0 && categorySlug) {
      const matchingBlog = blogs.find((blog: Blog) => {
        const cat = normalizeCategory(blog);
        return toCategorySlug(cat) === categorySlug;
      });

      if (matchingBlog) {
        const resolvedCategory = normalizeCategory(matchingBlog) || categorySlug;
        setActualCategory(resolvedCategory);
      } else {
        setActualCategory(formatCategoryName(categorySlug));
      }
    }
  }, [blogs, categorySlug]);

  const breadCrumb = [
    { name: "Blogs", link: "/blogs", current: false },
    {
      name: formatCategoryName(actualCategory || categorySlug) || "Category",
      link: `/blogs/${categorySlug}`,
      current: true,
    },
  ];

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

  const filteredBlogs = blogs.filter((blog: Blog) => {
    const category = toCategorySlug(normalizeCategory(blog) || "");
    const title = (normalizeTitle(blog) || "").toLowerCase();
    const term = (searchTerm || "").toLowerCase();
    const matchesCategory = category === categorySlug;
    const matchesSearch = title.includes(term);
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "all",
    ...new Set(
      blogs
        .map((blog: Blog) => normalizeCategory(blog))
        .filter((cat) => typeof cat === "string" && cat.trim() !== "")
    ),
  ];

  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === "all") {
      router.push("/blogs/");
    } else {
      router.push(`/blogs/${toCategorySlug(newCategory)}/`);
    }
  };

  return (
    <>
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <TopBar />
      <Nav />
      <BreadCrumb breadcrumb={breadCrumb} />
      <div
        className={`blogs-themed container mx-auto max-w-screen-xl py-10 px-4${
          navbarVariantTestConfig?.variant === "podcast" ? " blogs-podcast" : ""
        }`}
      >
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-8 text-center">
          {formatCategoryName(actualCategory || categorySlug)} Blogs
        </h2>

        <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search blogs..."
              className="w-full p-4 border-2 border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200 shadow-sm hover:shadow-md pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <select
            className="p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200 shadow-sm hover:shadow-md cursor-pointer bg-white min-w-[200px] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:12px_12px] bg-[right_1rem_center] pr-12 text-gray-700 font-medium"
            value={actualCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categories.map((cat) => (
              <option
                key={cat}
                value={cat}
                className="py-2 px-4 font-medium capitalize"
              >
                {cat === "all" ? "All Categories" : formatCategoryName(cat)}
              </option>
            ))}
          </select>
        </div>

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
              type="button"
              onClick={() => void loadBlogs()}
              className="blogs-active-chip inline-flex items-center rounded-md border border-transparent bg-primary px-6 py-3 text-base font-medium shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-medium text-gray-700 mb-4">No blogs found</h3>
            <p className="text-gray-500 mb-8">
              Try adjusting your search or browse other categories
            </p>
            <Link
              href="/blogs/"
              className="blogs-active-chip inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-primary"
            >
              View All Blogs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentBlogs
              .filter((blog: Blog) => {
                const slug = blog.slug || blog.permalink || "";
                return slug && slug.trim() !== "";
              })
              .map((blog: Blog) => (
                <div
                  key={blog._id}
                  className="transform hover:scale-105 transition duration-300"
                >
                  <BlogCard {...blog} />
                </div>
              ))}
          </div>
        )}

        {filteredBlogs.length > 0 && (
          <div className="flex justify-center items-center space-x-3 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition duration-200 flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>

            <div className="flex space-x-2">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition duration-200 ${
                    currentPage === index + 1
                      ? "blogs-active-chip bg-primary shadow-lg transform scale-110"
                      : "border-2 hover:bg-gray-50"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition duration-200 flex items-center space-x-2"
            >
              <span>Next</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}