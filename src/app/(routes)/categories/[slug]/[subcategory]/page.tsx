import { Suspense } from "react";
import Nav from "@/app/components/navbar/Nav";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
// import TopBar from "@/app/topbar/page";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SubCategoryContent from "./SubCategoryContent";
import ProductList from "./ProductList";
import TrustBoxWidget from "@/app/components/trusBoxWidget";
import { resolveCategoryImageSrc } from "@/lib/categoryBannerSrc";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import {
  getPaginatedProducts,
  PRODUCT_CARDS_PER_PAGE,
} from "@/app/components/productCardUtils";
import type { Product } from "../../../../../../types";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getSubCategoryData(subCategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(subCategoryName)}`,
      { cache: "no-store" }
    );

    if (!res.ok && subCategoryName !== toOriginalCase(subCategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(toOriginalCase(subCategoryName))}`,
        { cache: "no-store" }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.subcategoryDetails || null;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}

async function getProducts(subCategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/product/by/subcategory/${encodeURIComponent(subCategoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && subCategoryName !== toOriginalCase(subCategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/product/by/subcategory/${encodeURIComponent(toOriginalCase(subCategoryName))}`,
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
export default async function SubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, subcategory } = await params;
  const pageRaw = Number((await searchParams).page || "1");
  const currentPage =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const [categoryData, products, navbarVariantTestConfig] = await Promise.all([
    getSubCategoryData(subcategory),
    getProducts(subcategory),
    getNavbarVariantTestPublicServer(),
  ]);
  if (!categoryData) {
    notFound();
  }
  const bannerSrc = resolveCategoryImageSrc(categoryData.banner);
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
  return (
    <>
      {/* <header className="relative">
        <nav className="" aria-label="Top">
          
          <Nav />
        </nav>
      </header> */}
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <div className="max-w-7xl mx-auto p-3">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href={`/categories/${slug}/`} className="hover:underline capitalize">
            {slug.replace(/-/g, " ")}
          </Link>
          <span className="mx-2">»</span>
          <span className="capitalize">{subcategory.replace(/-/g, " ")}</span>
        </nav>

        <div className="relative mb-5">
          {bannerSrc ? (
            <Image
              className="rounded-xl w-full"
              src={bannerSrc}
              alt={`${subcategory} Banner`}
              width={1920}
              height={500}
            />
          ) : (
            <div className="rounded-xl w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No Banner Available</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <section className="order-2" aria-label="Subcategory information">
            <SubCategoryContent
              content={categoryData.content}
              content_blocks={categoryData.content_blocks}
              metaTitle={categoryData.metaTitle}
              metaDescription={categoryData.metaDescription}
              metaSchemas={categoryData.metaSchemas}
            />
          </section>
          <div className="order-1">
            <Suspense fallback={<div>Loading products...</div>}>
              <ProductList
                initialProducts={products}
                subCategoryName={subcategory}
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
