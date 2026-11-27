"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/lib/hooks";
import { RootState } from "@/app/lib/store";
import { fetchProducts } from "@/app/lib/features/products/getProductSlice";
import { SortOptions } from "@/app/components/SortOptions";
import { Product, SortOption } from "../../../../types";
import Pagination from "@/app/components/Pagination";
import ProductCardWithStockClient from "@/app/components/ProductCardWithStockClient";
import Link from "next/link";
import ShopAllFilterSidebar from "@/app/components/ShopAllFilterSidebar";
import FilterDrawer from "@/app/components/FilterDrawer";
import SortMenu from "@/app/components/SortMenu";
import { useAuth } from "@/app/context/Auth";
export default function ShopAll() {
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const { products } = useAppSelector((state: RootState) => state.products);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedSort, setSelectedSort] = useState<SortOption>(SortOptions[0]);
  const productsPerPage = 50;
  const lastFetchedPricingScopeRef = useRef<string | null>(null);
  const pricingGroupId = auth?.user?.pricingGroup
    ? String(auth.user.pricingGroup)
    : null;
  const userId = auth?.user?._id ? String(auth.user._id) : null;

  useEffect(() => {
    const scopeKey = `${pricingGroupId ?? "nogroup"}|${userId ?? "nouid"}`;
    const shouldRefetch =
      lastFetchedPricingScopeRef.current !== scopeKey || products.length === 0;

    if (shouldRefetch) {
      lastFetchedPricingScopeRef.current = scopeKey;
      dispatch(
        fetchProducts(
          userId
            ? {
                userId,
                ...(pricingGroupId ? { groupId: pricingGroupId } : {}),
              }
            : undefined
        )
      );
    }
  }, [dispatch, userId, pricingGroupId, products.length]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;

  const currentProducts = useMemo(() => {
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [filteredProducts, indexOfFirstProduct, indexOfLastProduct]);

  return (
    <>
      <main className="max-w-7xl mx-auto p-4">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/shopall" className="hover:underline">
            Shop All
          </Link>
        </nav>

        <div className="my-5 py-5">
          <div>
            <div className="flex items-center justify-end gap-2">
              <FilterDrawer>
                {(close) => (
                  <ShopAllFilterSidebar
                    products={products}
                    setFilteredProducts={setFilteredProducts}
                    selectedSort={selectedSort}
                    onClose={close}
                  />
                )}
              </FilterDrawer>
              <SortMenu
                selectedSort={selectedSort}
                setSelectedSort={
                  setSelectedSort as React.Dispatch<
                    React.SetStateAction<{ name: string }>
                  >
                }
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:p-5">
              {currentProducts.length === 0 ? (
                <div>No products found</div>
              ) : (
                currentProducts.map((product, index) => (
                  <ProductCardWithStockClient
                    key={index}
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
              setCurrentPage={setCurrentPage}
              indexOfFirstProduct={indexOfFirstProduct}
              indexOfLastProduct={indexOfLastProduct}
            />
          </div>
        </div>
      </main>
      </>
  );
}
