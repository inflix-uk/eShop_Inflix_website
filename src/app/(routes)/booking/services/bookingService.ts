import axios from 'axios';
import { loadStripe, Stripe } from '@stripe/stripe-js';

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
const API_URL: string = rawApiUrl.endsWith('/') ? rawApiUrl : `${rawApiUrl}/`;

export interface BookingSettings {
  isEnabled: boolean;
  slotIntervalMinutes: number;
  holdDurationMinutes: number;
  timezone: string;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
}

export interface BookingPackage {
  _id: string;
  name: string;
  slug: string | null;
  type: 'service' | 'consultation' | 'studio';
  durationMinutes: number;
  price: number;
  description: string;
  detailPage: string;
  features: string[];
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  extras?: BookingPackageExtra[];
}

export interface BookingPackageExtra {
  image?: string;
  title: string;
  price: number;
  description?: string;
}

export interface SelectedBookingExtra {
  index: number;
  title: string;
  price: number;
  image?: string;
  description?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailableSlotsResponse {
  success: boolean;
  error: string | null;
  slots: TimeSlot[];
  package?: {
    id: string;
    name: string;
    type: string;
    durationMinutes: number;
    price: number;
  };
  date: string;
  dayOfWeek: number;
  timezone: string;
  blocked?: boolean;
  reason?: string;
  noAvailability?: boolean;
}

export interface SlotHold {
  holdId: string;
  packageId: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
}

export interface SelectedBookingSlot {
  date: string;
  startTime: string;
  endTime: string;
  holdId?: string;
}

export interface StoredBookingData {
  holdId?: string;
  holdIds?: string[];
  packageId: string;
  packageName?: string;
  packageType?: string;
  packagePrice?: number;
  packageDuration?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  slots: SelectedBookingSlot[];
  holdExpiresAt: string;
  sessionId?: string;
  totalPrice: number;
  selectedExtras?: SelectedBookingExtra[];
  slotsSubtotal?: number;
  extrasSubtotal?: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface Booking {
  bookingId: string;
  bookingNumber: string;
  packageId: string;
  type: string;
  customer: CustomerInfo;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  groupBookingNumber?: string;
  package?: {
    name: string;
    price: number;
    durationMinutes: number;
  };
}

export interface GroupBookingSlot {
  bookingNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export class BookingService {
  private stripePromise: Promise<Stripe | null> | null = null;

  static init(): BookingService {
    return new BookingService();
  }

  async getSettings(): Promise<BookingSettings | null> {
    try {
      const response = await axios.get(`${API_URL}booking/settings/public`);
      return response.data.settings;
    } catch (error) {
      console.error('Error fetching booking settings:', error);
      return null;
    }
  }

  async getPackages(type?: string): Promise<BookingPackage[]> {
    try {
      const params = type ? { type } : {};
      const response = await axios.get(`${API_URL}get/booking/packages`, { params });
      return response.data.packages || [];
    } catch (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
  }

  async getPackageById(packageId: string): Promise<BookingPackage | null> {
    try {
      const response = await axios.get(`${API_URL}get/booking/package/${packageId}`);
      return response.data.package;
    } catch (error) {
      console.error('Error fetching package:', error);
      return null;
    }
  }

  async getAvailableSlots(packageId: string, date: string): Promise<AvailableSlotsResponse> {
    try {
      const response = await axios.get(`${API_URL}get/booking/slots`, {
        params: { packageId, date },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching slots:', error);
      return {
        success: false,
        error: 'Failed to fetch available slots',
        slots: [],
        date,
        dayOfWeek: 0,
        timezone: 'Europe/London',
      };
    }
  }

  async createSlotHold(
    packageId: string,
    date: string,
    startTime: string,
    sessionId?: string
  ): Promise<{ success: boolean; hold?: SlotHold; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking/hold`, {
        packageId,
        date,
        startTime,
        sessionId,
      });
      return { success: true, hold: response.data.hold };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to hold slot' };
    }
  }

  async createMultiSlotHold(
    packageId: string,
    slots: Array<{ date: string; startTime: string }>,
    sessionId?: string
  ): Promise<{ success: boolean; holds?: SlotHold[]; expiresAt?: string; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking/hold`, {
        packageId,
        slots,
        sessionId,
      });
      return {
        success: true,
        holds: response.data.holds || (response.data.hold ? [response.data.hold] : []),
        expiresAt: response.data.expiresAt || response.data.holds?.[0]?.expiresAt,
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to hold slots' };
    }
  }

  async releaseSlotHold(holdId: string): Promise<boolean> {
    try {
      await axios.post(`${API_URL}release/booking/hold`, { holdId });
      return true;
    } catch {
      return false;
    }
  }

  async releaseSlotHolds(holdIds: string[]): Promise<boolean> {
    try {
      await axios.post(`${API_URL}release/booking/hold`, { holdIds });
      return true;
    } catch {
      return false;
    }
  }

  async createBooking(
    holdId: string,
    customer: CustomerInfo,
    notes?: string
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking`, { holdId, customer, notes });
      return { success: true, booking: response.data.booking };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to create booking' };
    }
  }

  async createMultiBooking(
    holdIds: string[],
    customer: CustomerInfo,
    notes?: string
  ): Promise<{
    success: boolean;
    booking?: Booking;
    bookings?: Booking[];
    groupBookingNumber?: string;
    totalAmount?: number;
    error?: string;
  }> {
    try {
      const response = await axios.post(`${API_URL}create/booking`, { holdIds, customer, notes });
      return {
        success: true,
        booking: response.data.booking,
        bookings: response.data.bookings,
        groupBookingNumber: response.data.groupBookingNumber,
        totalAmount: response.data.totalAmount,
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to create bookings' };
    }
  }

  async createPaymentIntent(
    bookingId: string,
    amount: number,
    currency: string = 'gbp'
  ): Promise<{ success: boolean; data?: PaymentIntentResponse; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking/payment-intent`, {
        bookingId,
        amount,
        currency,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Failed to create payment' };
    }
  }

  async getBookingByNumber(bookingNumber: string): Promise<{
    booking: Booking | null;
    groupSlots?: GroupBookingSlot[];
    slotCount?: number;
  }> {
    try {
      const normalized = bookingNumber.trim().charAt(0).toUpperCase() + bookingNumber.trim().slice(1);
      const response = await axios.get(`${API_URL}get/booking/${encodeURIComponent(normalized)}`);
      return {
        booking: response.data.booking,
        groupSlots: response.data.groupSlots,
        slotCount: response.data.slotCount,
      };
    } catch {
      return { booking: null };
    }
  }

  async initializeStripe(): Promise<Stripe | null> {
    if (!this.stripePromise) {
      this.stripePromise = this.fetchStripePromise();
    }
    return this.stripePromise;
  }

  private async fetchStripePromise(): Promise<Stripe | null> {
    try {
      const response = await axios.get(`${API_URL}config`);
      return await loadStripe(response.data.publishableKey);
    } catch {
      return null;
    }
  }

  generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  formatDate(dateStr: string): string {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatPrice(price: number): string {
    return `£${price.toFixed(2)}`;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      service: 'Service',
      consultation: 'Consultation',
      studio: 'Studio Session',
    };
    return labels[type] || type;
  }

  getDateInTimezone(timezone = 'Europe/London'): string {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(new Date());
  }

  addDaysToDateStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().split('T')[0];
  }

  slotsOverlap(
    a: TimeSlot & { date: string },
    b: TimeSlot & { date: string }
  ): boolean {
    if (a.date !== b.date) return false;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
  }

  resolveImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const origin = API_URL.replace(/\/$/, '');
    if (path.startsWith('/uploads/')) return `${origin}${path}`;
    if (path.startsWith('/')) return `${origin}/uploads${path}`;
    return `${origin}/uploads/${path}`;
  }

  computeBookingTotal(
    packagePrice: number,
    slotCount: number,
    selectedExtras: SelectedBookingExtra[] = []
  ) {
    const slotsSubtotal = packagePrice * slotCount;
    const extrasSubtotal = selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
    return {
      slotsSubtotal,
      extrasSubtotal,
      totalPrice: slotsSubtotal + extrasSubtotal,
    };
  }
}

export const bookingService = BookingService.init();
