// pages/api/opay-payment.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import CryptoJS from 'crypto-js';

interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  customerEmail?: string;
  customerName?: string;
}

export async function POST(request: Request) {
  try {
    const { amount, currency, reference, callbackUrl, customerEmail, customerName }: PaymentRequest = await request.json();

    if (!amount || !currency || !reference || !callbackUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Construct payload according to OPay WAAS API
    const payload = {
      amount: amount.toString(),
      currency,
      reference,
      callbackUrl,
      customerEmail: customerEmail || 'customer@example.com',
      customerName: customerName || 'Customer',
      merchantId: process.env.OPAY_MERCHANT_ID,
      country: 'NG', // Nigeria
      paymentMethod: 'BankTransfer', // or 'Account', 'BankCard'
      productName: 'Payment',
      productDescription: 'Payment for goods/services',
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/return`,
      expireAt: Math.floor(Date.now() / 1000) + 1800, // 30 minutes expiry
    };

    // Generate signature
    const stringToSign = `${JSON.stringify(payload)}${process.env.OPAY_SECRET_KEY}`;
    const signature = CryptoJS.HmacSHA256(stringToSign, process.env.OPAY_SECRET_KEY || '')
      .toString(CryptoJS.enc.Hex);

    // Make request to OPay WAAS API
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_OPAY_HOST_URL}/api/v3/waas/transaction/initialize`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPAY_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
          'X-Signature': signature,
        },
      }
    );

    if (!response.data.data?.paymentUrl) {
      throw new Error('No payment URL in response');
    }

    return NextResponse.json({
      success: true,
      paymentUrl: response.data.data.paymentUrl,
      reference: response.data.data.reference,
    });
  } catch (error: any) {
    console.error('OPay payment error:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        error: 'Failed to initiate payment',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}