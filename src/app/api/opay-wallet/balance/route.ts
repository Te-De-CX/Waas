import { NextResponse } from 'next/server';
import axios from 'axios';
import CryptoJS from 'crypto-js';

export async function POST(request: Request) {
  try {
    console.log('Starting balance query process...');

    // Log environment variables (mask sensitive data)
    console.log('Environment Variables:', {
      hostUrl: process.env.NEXT_PUBLIC_OPAY_HOST_URL || 'MISSING',
      merchantId: process.env.OPAY_MERCHANT_ID ? '[REDACTED]' : 'MISSING',
      secretKey: process.env.OPAY_SECRET_KEY ? '[REDACTED]' : 'MISSING',
      publicKey: process.env.NEXT_PUBLIC_OPAY_PUBLIC_KEY ? '[REDACTED]' : 'MISSING',
      saltIndex: process.env.OPAY_SALT_INDEX ? '[REDACTED]' : 'MISSING',
    });

    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_OPAY_HOST_URL ||
      !process.env.OPAY_MERCHANT_ID ||
      !process.env.OPAY_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_OPAY_PUBLIC_KEY ||
      !process.env.OPAY_SALT_INDEX
    ) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing OPAY environment variables' },
        { status: 500 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request Body:', body);
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError.message);
      return NextResponse.json(
        { error: 'Invalid request body', details: parseError.message },
        { status: 400 }
      );
    }

    const { depositCode } = body;

    // Validate required fields
    if (!depositCode) {
      console.error('Missing required field: depositCode');
      return NextResponse.json(
        { error: 'Missing required field: depositCode' },
        { status: 400 }
      );
    }

    const payload = {
      opayMerchantId: process.env.OPAY_MERCHANT_ID,
      depositCode,
    };

    console.log('Prepared payload:', payload);

    // Generate HMAC signature
    const timestamp = Date.now().toString();
    const saltIndex = process.env.OPAY_SALT_INDEX || '';
    const secretKey = process.env.OPAY_SECRET_KEY || '';
    const stringToSign = `${JSON.stringify(payload)}${timestamp}${secretKey}${saltIndex}`;
    const signature = CryptoJS.HmacSHA256(stringToSign, secretKey).toString(CryptoJS.enc.Hex);
    console.log('Generated HMAC Signature:', '[REDACTED]');
    console.log('Timestamp:', timestamp);
    console.log('Salt Index:', saltIndex);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'clientAuthKey': process.env.OPAY_SECRET_KEY,
      'version': '2',
      'bodyFormat': 'JSON',
      'MerchantId': process.env.OPAY_MERCHANT_ID,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'User-Agent': 'OPay-WAAS-App/1.0',
    };
    console.log('Request Headers:', {
      ...headers,
      clientAuthKey: '[REDACTED]',
      'X-Signature': '[REDACTED]',
    });

    // Call OPay API
    const endpoint = `${process.env.NEXT_PUBLIC_OPAY_HOST_URL}/api/v2/third/depositcode/queryWalletBalance`;
    console.log('Calling endpoint:', endpoint);

    let response;
    try {
      response = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000,
      });
    } catch (axiosError: any) {
      console.error('Axios request failed:', {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response?.data || 'No response data',
        status: axiosError.response?.status || 'No status',
      });
      throw axiosError;
    }

    console.log('API response:', response.data);
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);

    if (response.data.code !== '00000') {
      console.error('OPay API error:', response.data.message);
      throw new Error(response.data.message || 'Failed to query balance');
    }

    console.log('Balance query successful');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data || 'No response data',
      status: error.response?.status || 'No status',
      config: error.config
        ? {
            url: error.config.url,
            method: error.config.method,
            headers: error.config.headers
              ? { ...error.config.headers, clientAuthKey: '[REDACTED]', 'X-Signature': '[REDACTED]' }
              : undefined,
            data: error.config.data,
          }
        : 'No config',
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to query balance',
        details: error.response?.data?.message || error.message,
        code: error.response?.data?.code || 'UNKNOWN_ERROR',
      },
      { status: error.response?.status || 500 }
    );
  }
}