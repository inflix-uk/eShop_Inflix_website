// redux/getProductsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { Product } from "../../../../../types";

interface ProductsState {
  products: Product[]; // Array of products
  isLoading: boolean;
  error: string | null;
}

// Thunk for fetching products
export const fetchProducts = createAsyncThunk<
  Product[], // The returned data type (an array of Product objects)
  { groupId?: string; userId?: string } | void, // Optional pricing scope
  { rejectValue: string } // The type of the error
>("products/fetchProducts", async (arg, { rejectWithValue }) => {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return rejectWithValue("API URL is not configured");
  }

  try {
    const groupId = typeof arg === "object" && arg?.groupId ? String(arg.groupId).trim() : "";
    const userId = typeof arg === "object" && arg?.userId ? String(arg.userId).trim() : "";
    const params = new URLSearchParams();
    if (groupId) params.set("groupId", groupId);
    if (userId) params.set("userId", userId);
    const query = params.toString() ? `?${params.toString()}` : "";
    const requestUrl = `${base}/api/products${query}`;
    /** Local / cold APIs often exceed 8s; keeps dev from noisy aborts while still bounded. */
    const response = await axios.get(requestUrl, { timeout: 20_000 });

    const body = response.data ?? {};
    const code = body.status;
    // Backend / BFF may use 200 or 201 in the JSON body for success
    if (code === 201 || code === 200) {
      const raw = body.products;
      const normalized = Array.isArray(raw) ? raw : [];
      return normalized;
    }
    return rejectWithValue(
      typeof body.message === "string" ? body.message : "Failed to load products"
    );
  } catch (error: unknown) {
    let message = "Failed to load products";

    if (axios.isAxiosError(error)) {
      message = error.message || message;
      const data = error.response?.data;
      const serverMsg =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : null;
      if (serverMsg) message = serverMsg;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }

    // Never use console.error here — Next.js surfaces it as a runtime error overlay.
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_DEBUG_FETCH === "1"
    ) {
      console.debug(
        "[fetchProducts]",
        message,
        requestUrlFromThunk(base, arg),
        axios.isAxiosError(error) ? error.code : undefined
      );
    }

    return rejectWithValue(message);
  }
});

function requestUrlFromThunk(
  base: string,
  arg: { groupId?: string; userId?: string } | void
): string {
  const groupId = typeof arg === "object" && arg?.groupId ? String(arg.groupId).trim() : "";
  const userId = typeof arg === "object" && arg?.userId ? String(arg.userId).trim() : "";
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (userId) params.set("userId", userId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return `${base}/api/products${query}`;
}

// Products Slice
const productsSlice = createSlice({
  name: "products",
  initialState: {
    products: [], // Initialize products as an empty array
    isLoading: false,
    error: null,
  } as ProductsState, // Type the initial state
  reducers: {}, // No synchronous reducers for now
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null; // Clear previous error on new request
      })
      .addCase(
        fetchProducts.fulfilled,
        (state, action: PayloadAction<Product[]>) => {
          state.isLoading = false;
          state.products = Array.isArray(action.payload) ? action.payload : [];
        }
      )
      .addCase(
        fetchProducts.rejected,
        (state, action) => {
          state.isLoading = false;
          state.error =
            (typeof action.payload === "string" && action.payload) ||
            action.error.message ||
            "Failed to load products";
        }
      );
  },
});

export default productsSlice.reducer;
