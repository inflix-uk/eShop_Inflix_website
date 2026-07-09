import axios from 'axios';
import type { GetReturnsResponse, ApiResponse, RequestOrder } from '../types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

const authConfig = { withCredentials: true as const };

/**
 * Fetch all return requests for the authenticated customer (JWT cookie).
 */
export const getUserReturns = async (_userId?: string): Promise<GetReturnsResponse> => {
  try {
    const response = await axios.get(`${baseUrl}/my/return-requests`, authConfig);
    return response.data;
  } catch (error) {
    console.error('Error fetching user returns:', error);
    throw error;
  }
};

/**
 * Send a message for a return order
 */
export const sendReturnMessage = async (
  _senderId: string,
  message: string,
  files: File[],
  requestOrder: RequestOrder
): Promise<ApiResponse> => {
  try {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('requestOrder', JSON.stringify(requestOrder));

    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axios.post(`${baseUrl}/my/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

const returnsService = {
  getUserReturns,
  sendReturnMessage,
};

export default returnsService;
