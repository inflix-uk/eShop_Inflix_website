import { Coupon, ProductItem } from '../../../../../types';
import { toast } from 'react-toastify';
import { api } from '../api';

export interface CouponValidationResult {
  isValid: boolean;
  error: string;
  coupon?: Coupon;
}

export class CouponService {
  static init(): CouponService {
    return new CouponService();
  }

  async validateCouponWithServer(
    enteredCode: string,
    cartTotal: number,
    userId?: string
  ): Promise<CouponValidationResult> {
    const code = enteredCode.trim();
    if (!code) {
      return { isValid: false, error: 'Enter a coupon code' };
    }

    try {
      const response = await api.validateCoupon({
        code,
        cartTotal,
        userId,
      });

      if ((response.success || response.status === 201) && response.coupon) {
        return { isValid: true, error: '', coupon: response.coupon };
      }

      return {
        isValid: false,
        error: response.message || 'Invalid coupon code',
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.status === 404 ? 'Invalid coupon code' : null) ||
        'Unable to validate coupon. Please try again.';
      return { isValid: false, error: message };
    }
  }

  calculateTotalSalePrice(products: ProductItem[], coupon: Coupon | null = null): number {
    let total = products
      .reduce((sum, product) => {
        return sum + parseFloat((product.salePrice * product.qty).toFixed(2));
      }, 0);

    if (coupon) {
      total = this.applyCouponDiscount(total, coupon);
    }

    return Math.max(0, parseFloat(total.toFixed(2)));
  }

  private applyCouponDiscount(total: number, coupon: Coupon): number {
    if (coupon.discount_type === 'flat') {
      return total - coupon.discount;
    } else if (coupon.discount_type === 'percentage') {
      const discountAmount = (total * coupon.discount) / 100;
      return total - (coupon.upto ? Math.min(discountAmount, coupon.upto) : discountAmount);
    }
    return total;
  }

  getCartTotal(): number {
    try {
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      return this.calculateTotalSalePrice(cartData);
    } catch {
      return 0;
    }
  }

  storeAppliedCoupon(coupon: Coupon): void {
    localStorage.removeItem('appliedcoupon');
    localStorage.setItem('appliedcoupon', JSON.stringify(coupon));
  }

  getStoredCoupon(): Coupon | null {
    try {
      const storedCoupon = localStorage.getItem('appliedcoupon');
      return storedCoupon ? JSON.parse(storedCoupon) : null;
    } catch {
      return null;
    }
  }

  removeStoredCoupon(): void {
    localStorage.removeItem('appliedcoupon');
  }

  validateStoredCoupon(): boolean {
    const storedCoupon = this.getStoredCoupon();
    if (!storedCoupon) return true;

    try {
      // Check if coupon is expired
      const currentDate = new Date();
      const expiryDate = new Date((storedCoupon as any).expiryDate);

      if (expiryDate < currentDate) {
        this.removeStoredCoupon();
        toast.error('Coupon removed: it has expired.');
        return false;
      }

      // Check minimum order value
      const currentTotal = this.getCartTotal();
      if ((storedCoupon as any).minOrderValue > 0 && currentTotal < (storedCoupon as any).minOrderValue) {
        this.removeStoredCoupon();
        toast.error(`Coupon removed: minimum order of £${(storedCoupon as any).minOrderValue} not met.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating stored coupon:', error);
      this.removeStoredCoupon();
      return false;
    }
  }
}