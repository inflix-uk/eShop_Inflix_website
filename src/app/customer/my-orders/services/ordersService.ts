import axios from 'axios';
import type { GetOrdersResponse, ReturnItemResponse, ImageFile } from '../types';

/**
 * Orders Service - Handles all API calls for customer orders
 */

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

const authConfig = { withCredentials: true as const };

/**
 * Fetch all orders for the authenticated customer (JWT cookie).
 */
export const getUserOrders = async (_userId?: string): Promise<GetOrdersResponse> => {
  try {
    const response = await axios.get(`${baseUrl}/my/orders`, authConfig);
    return response.data;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
};

/**
 * Submit a return request for an order
 */
export const submitReturnRequest = async (
  orderData: object,
  reason: string,
  additionalDetails: string,
  images: ImageFile[],
  status: string = 'Pending'
): Promise<ReturnItemResponse> => {
  try {
    const formData = new FormData();
    formData.append('orderDetails', JSON.stringify(orderData));
    formData.append('reason', reason);
    formData.append('status', status);
    formData.append('additionalDetails', additionalDetails);

    images.forEach((image) => {
      formData.append('images', image.file);
    });

    const response = await axios.post(`${baseUrl}/return/ThisItem`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting return request:', error);
    throw error;
  }
};

/**
 * Get order tracking information
 */
export const getOrderTracking = async (orderId: string): Promise<{ trackingUrl: string }> => {
  try {
    const response = await axios.get(`${baseUrl}/get/order/tracking/${orderId}`, authConfig);
    return response.data;
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    throw error;
  }
};

// Default export with all service methods
const ordersService = {
  getUserOrders,
  submitReturnRequest,
  getOrderTracking,
};

export default ordersService;
