import CryptoJS from 'crypto-js';
import axios from 'axios';

// Environment variables - ensure these are in your .env.local
const OPAY_API_URL = process.env.NEXT_PUBLIC_OPAY_API_URL;
const MERCHANT_ID = process.env.OPAY_MERCHANT_ID;
const PUBLIC_KEY = process.env.OPAY_PUBLIC_KEY;
const SECRET_KEY = process.env.OPAY_SECRET_KEY;
const CLIENT_AUTH_KEY = process.env.OPAY_CLIENT_AUTH_KEY; // Add this to your .env

if (!OPAY_API_URL || !MERCHANT_ID || !PUBLIC_KEY || !SECRET_KEY || !CLIENT_AUTH_KEY) {
  throw new Error('Missing required OPay environment variables');
}

interface OPayResponse<T> {
  code: string;
  message: string;
  data?: T;
}

export async function makeOpayRequest<T>(
  endpoint: string,
  payload: any
): Promise<OPayResponse<T>> {
  try {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const apiUrl = `${OPAY_API_URL}${normalizedEndpoint}`;

    const timestamp = Date.now();
    const stringToSign = `${JSON.stringify(payload)}${timestamp}${SECRET_KEY}`;
    const signature = CryptoJS.HmacSHA256(stringToSign, SECRET_KEY).toString();

    const headers = {
      'Content-Type': 'application/json',
      'MerchantId': MERCHANT_ID,
      'Authorization': `Bearer ${PUBLIC_KEY}`,
      'X-Signature': signature,
      'X-Timestamp': timestamp.toString(),
      'clientAuthKey': CLIENT_AUTH_KEY, // Add this required header
    };

    console.log('Making request to:', apiUrl);
    console.log('With headers:', {
      ...headers,
      'clientAuthKey': '*****' // Don't log the actual key
    });

    const response = await axios.post(apiUrl, payload, {
      headers,
      timeout: 10000,
    });

    if (response.data.code !== '00000') {
      throw new Error(response.data.message || 'OPay API error');
    }

    return response.data;
  } catch (error: any) {
    console.error('OPay API error details:', {
      message: error.message,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers ? {
          ...error.config.headers,
          'clientAuthKey': '*****',
          'Authorization': '*****'
        } : undefined
      }
    });
    throw error;
  }
}

// Type definitions for wallet operations
export interface Wallet {
  depositCode: string;
  name: string;
  refId?: string;
  emailOrPhone: string;
  accountType: string;
}