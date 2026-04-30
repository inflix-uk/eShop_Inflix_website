import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { NavbarItem } from "./navbarTypes";
import { normalizeNavbarItemsForPublicNav } from "./navbarCategoryNormalize";

interface NavbarCategoryState {
  items: NavbarItem[];
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  auth: {
    ip: string;
  };
}

export const fetchNavbarCategory = createAsyncThunk<
  NavbarItem[],
  void,
  { rejectValue: string; state: RootState }
>(
  "navbarCategory/fetchNavbarCategory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/navbar`, { timeout: 8000 });
      if (response.status === 200) {
        return normalizeNavbarItemsForPublicNav(response.data?.data);
      }
      const errorMessage =
        response.data?.message || "Unknown error occurred";
      return rejectWithValue(errorMessage);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.message || err.message || "Network error";
      return rejectWithValue(errorMessage);
    }
  }
);

const navbarCategorySlice = createSlice({
  name: "navbarCategory",
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  } as NavbarCategoryState,
  reducers: {
    hydrateNavbarFromServer: (state, action: PayloadAction<NavbarItem[]>) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNavbarCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchNavbarCategory.fulfilled,
        (state, action: PayloadAction<NavbarItem[]>) => {
          state.isLoading = false;
          state.items = action.payload;
        }
      )
      .addCase(fetchNavbarCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { hydrateNavbarFromServer } = navbarCategorySlice.actions;
export default navbarCategorySlice.reducer;
