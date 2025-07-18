import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

export async function POST(request: Request) {
  try {
    const headers = Object.fromEntries(request.headers.entries());
    const callbackData = await request.json();

    // Verify headers
    const transactionId = headers['x-opay-tranid'];
    const merchantId = headers['merchantid'];

    if (!transactionId || !merchantId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Verify signature (if provided)
    if (headers['x-signature']) {
      const expectedSignature = CryptoJS.HmacSHA256(
        JSON.stringify(callbackData),
        process.env.OPAY_SECRET_KEY || ''
      ).toString();

      if (headers['x-signature'] !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        );
      }
    }

    // Process the callback
    console.log('OPay Wallet Callback:', callbackData);

    return NextResponse.json({ code: '00000', message: 'SUCCESSFUL' });
  } catch (error: any) {
    console.error('Callback processing error:', error);
    return NextResponse.json(
      { code: '500', message: error.message || 'Failed to process callback' },
      { status: 500 }
    );
  }
}