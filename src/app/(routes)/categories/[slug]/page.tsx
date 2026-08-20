import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CategoryContent from "./CategoryContent";
import ProductList from "./ProductList";
// import TopBar from "@/app/topbar/page";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import TrustBoxWidget from "@/app/components/trusBoxWidget";
import { resolveCategoryImageSrc } from "@/lib/categoryBannerSrc";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import {
  getPaginatedProducts,
  PRODUCT_CARDS_PER_PAGE,
} from "@/app/components/productCardUtils";
import {
  fetchNestedFooterPage,
  FooterPageShell,
  isPublishedFooterPage,
  normalizeFooterSlug,
} from "@/app/lib/footerPagePublic";
import { normalizeMetaSchemaJsonLdStrings } from "@/app/lib/homepageJsonLd";
import {
  adminSchemasIncludeItemList,
  buildProductItemListJsonLdString,
} from "@/app/lib/itemListJsonLd";
import type { Product } from "../../../../../types";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getCategoryData(categoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetailsFull/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetailsFull/${encodeURIComponent(toOriginalCase(categoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.category || null;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}

async function getProducts(categoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/products/category/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/products/category/${encodeURIComponent(toOriginalCase(categoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.products || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const categoryName = (await params).slug;
  const pageRaw = Number((await searchParams).page || "1");
  const currentPage =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const decodedSlug = normalizeFooterSlug(categoryName);
  const [categoryData, products, navbarVariantTestConfig] = await Promise.all([
    getCategoryData(categoryName),
    getProducts(categoryName),
    getNavbarVariantTestPublicServer(),
  ]);

  if (!categoryData) {
    const footerPage = await fetchNestedFooterPage("categories", decodedSlug);
    if (isPublishedFooterPage(footerPage)) {
      return (
        <FooterPageShell
          page={footerPage}
          navbarVariantTestConfig={navbarVariantTestConfig}
        />
      );
    }
    notFound();
  }

  const bannerSrc = resolveCategoryImageSrc(categoryData.bannerImage);
  const pageProducts = getPaginatedProducts<Product>(
    products,
    currentPage,
    PRODUCT_CARDS_PER_PAGE
  );
  const serverProductCards = pageProducts.map((product) => (
    <ProductCardWithStock
      key={product._id}
      product={product}
      checkStockRealTime={true}
    />
  ));

  const adminJsonLdStrings = normalizeMetaSchemaJsonLdStrings(
    categoryData.metaSchemas
  );
  const adminHasItemList = adminSchemasIncludeItemList(adminJsonLdStrings);

  // Auto ItemList when admin did not already provide one (and ≥2 visible products)
  let autoItemListJsonLd: string | null = null;
  if (!adminHasItemList) {
    autoItemListJsonLd = await buildProductItemListJsonLdString({
      listPath: `categories/${categoryName}`,
      name: categoryData.metaTitle,
      description: categoryData.metaDescription,
      products: pageProducts,
    });
  }

  return (
    <>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />

      {/* Admin-pasted JSON-LD */}
      {adminJsonLdStrings.map((json, index) => (
        <script
          key={`category-admin-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}

      {/* Auto ItemList for category product listing */}
      {autoItemListJsonLd ? (
        <script
          key="category-auto-itemlist"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: autoItemListJsonLd }}
        />
      ) : null}

      <div className="max-w-7xl mx-auto p-3">

        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
          <span className="mx-2">»</span>
          <span>{categoryName.replace(/-/g, " ")}</span>
        </nav>

        <div className="relative mb-5">
          {bannerSrc ? (
            <Image
              className="rounded-xl w-full"
              src={bannerSrc}
              alt={`${categoryName} Banner`}
              width={1920}
              height={500}
            />
          ) : (
            <div className="rounded-xl w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No Banner Available</span>
            </div>
          )}
        </div>

        {/*
          DOM order = SEO / heading outline order (CMS H1/H2/FAQ first, then product H3s).
          flex order keeps the grid + Trustpilot visually above the long copy (unchanged layout).
        */}
        <div className="flex flex-col">
          <section className="order-2" aria-label="Category information">
            <CategoryContent
              content={categoryData.content}
              content_blocks={categoryData.content_blocks}
              metaTitle={categoryData.metaTitle}
              metaDescription={categoryData.metaDescription}
              metaSchemas={[]}
            />
          </section>
          <div className="order-1">
            <Suspense fallback={<div>Loading products...</div>}>
              <ProductList
                initialProducts={products}
                categoryName={categoryName}
                serverProductCards={serverProductCards}
              />
            </Suspense>
            <TrustBoxWidget />
          </div>
        </div>
      </div>
      </>
  );
}
