import axios from 'axios';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Ensure API_URL has trailing slash
const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
const API_URL: string = rawApiUrl.endsWith('/') ? rawApiUrl : `${rawApiUrl}/`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  package?: {
    name: string;
    price: number;
    durationMinutes: number;
  };
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

// ============================================================================
// BOOKING SERVICE CLASS
// ============================================================================

export class BookingService {
  private stripePromise: Promise<Stripe | null> | null = null;

  static init(): BookingService {
    return new BookingService();
  }

  // Get booking settings
  async getSettings(): Promise<BookingSettings | null> {
    try {
      const response = await axios.get(`${API_URL}booking/settings/public`);
      return response.data.settings;
    } catch (error) {
      console.error('Error fetching booking settings:', error);
      return null;
    }
  }

  // Get all active packages
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

  // Get single package by ID
  async getPackageById(packageId: string): Promise<BookingPackage | null> {
    try {
      const response = await axios.get(`${API_URL}get/booking/package/${packageId}`);
      return response.data.package;
    } catch (error) {
      console.error('Error fetching package:', error);
      return null;
    }
  }

  // Get available slots for a date
  async getAvailableSlots(packageId: string, date: string): Promise<AvailableSlotsResponse> {
    try {
      const response = await axios.get(`${API_URL}get/booking/slots`, {
        params: { packageId, date }
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
        timezone: 'Europe/London'
      };
    }
  }

  // Create a slot hold
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
        sessionId
      });
      return {
        success: true,
        hold: response.data.hold
      };
    } catch (error: any) {
      console.error('Error creating slot hold:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to hold slot'
      };
    }
  }

  // Release a slot hold
  async releaseSlotHold(holdId: string): Promise<boolean> {
    try {
      await axios.post(`${API_URL}release/booking/hold`, { holdId });
      return true;
    } catch (error) {
      console.error('Error releasing hold:', error);
      return false;
    }
  }

  // Create booking from hold
  async createBooking(
    holdId: string,
    customer: CustomerInfo,
    notes?: string
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking`, {
        holdId,
        customer,
        notes
      });
      return {
        success: true,
        booking: response.data.booking
      };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create booking'
      };
    }
  }

  // Create payment intent for booking
  async createPaymentIntent(
    bookingId: string,
    amount: number,
    currency: string = 'gbp'
  ): Promise<{ success: boolean; data?: PaymentIntentResponse; error?: string }> {
    try {
      const response = await axios.post(`${API_URL}create/booking/payment-intent`, {
        bookingId,
        amount,
        currency
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create payment'
      };
    }
  }

  // Get booking by number
  async getBookingByNumber(bookingNumber: string): Promise<Booking | null> {
    try {
      const normalized = bookingNumber.trim().charAt(0).toUpperCase() + bookingNumber.trim().slice(1);
      const response = await axios.get(`${API_URL}get/booking/${encodeURIComponent(normalized)}`);
      return response.data.booking;
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  }

  // Initialize Stripe
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
    } catch (error) {
      console.error('Failed to load Stripe:', error);
      return null;
    }
  }

  // Generate session ID for slot holding
  generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format time for display
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  // Format date for display
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Format price
  formatPrice(price: number): string {
    return `£${price.toFixed(2)}`;
  }

  // Get package type label
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      service: 'Service',
      consultation: 'Consultation',
      studio: 'Studio Session'
    };
    return labels[type] || type;
  }
}

// Export singleton instance
export const bookingService = BookingService.init();
