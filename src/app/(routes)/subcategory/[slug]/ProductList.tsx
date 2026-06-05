"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import ProductCardWithStockClient from "@/app/components/ProductCardWithStockClient";
import SortMenu from "@/app/components/SortMenu";
import Pagination from "@/app/components/Pagination";
import SidebarCommon from "@/app/components/SidebarCommon";
import { Product, SortOption } from "../../../../../types";
import { SortOptions } from "@/app/components/SortOptions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ProductList({
  initialProducts,
  subCategoryName,
  serverProductCards,
}: {
  initialProducts: Product[];
  subCategoryName: string;
  serverProductCards?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(initialProducts);
  const [selectedSort, setSelectedSort] = useState<SortOption>(SortOptions[0]);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const rawPage = Number(searchParams.get("page") || "1");
    return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  });

  const productsPerPage = 50;
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const baselineSortedProducts = useMemo(
    () => [...products].sort(SortOptions[0].sortFunc),
    [products]
  );
  const catalogIsBaseline = useMemo(
    () =>
      filteredProducts.length === baselineSortedProducts.length &&
      filteredProducts.every(
        (product, index) => product._id === baselineSortedProducts[index]?._id
      ),
    [filteredProducts, baselineSortedProducts]
  );
  const urlPage = Number(searchParams.get("page") || "1");
  const normalizedUrlPage =
    Number.isFinite(urlPage) && urlPage > 0 ? Math.floor(urlPage) : 1;
  const useServerProductCards =
    Boolean(serverProductCards) &&
    catalogIsBaseline &&
    currentPage === normalizedUrlPage;

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  useEffect(() => {
    const rawPage = Number(searchParams.get("page") || "1");
    const nextPage =
      Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    setCurrentPage(nextPage);
  }, [searchParams]);

  const updatePageInUrl = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(
      `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false }
    );
  };

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
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
    <div className="grid grid-flow-row-dense lg:grid-cols-5 my-5 py-5">
      <SidebarCommon
        products={products}
        setFilteredProducts={setFilteredProducts}
        selectedSort={selectedSort}
        id={subCategoryName}
      />
      <div className="sm:col-span-4 col-span-5">
        <div className="flex items-center justify-end">
          <SortMenu
            selectedSort={selectedSort}
            setSelectedSort={
              setSelectedSort as React.Dispatch<
                React.SetStateAction<{ name: string }>
              >
            }
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:p-5">
          {currentProducts.length === 0 ? (
            <div>No products found</div>
          ) : useServerProductCards ? (
            serverProductCards
          ) : (
            currentProducts.map((product, index) => (
              <ProductCardWithStockClient
                key={product._id ?? index}
                product={product}
                checkStockRealTime={true}
              />
            ))
          )}
        </div>
        <Pagination
          filteredProducts={filteredProducts}
          productsPerPage={productsPerPage}
          currentPage={currentPage}
          setCurrentPage={(value) => {
            const nextPage =
              typeof value === "function" ? value(currentPage) : value;
            goToPage(nextPage);
          }}
          indexOfFirstProduct={indexOfFirstProduct}
          indexOfLastProduct={indexOfLastProduct}
        />
      </div>
    </div>
  );
}
