import { NextResponse } from 'next/server';
import axios from 'axios';
import CryptoJS from 'crypto-js';

export async function POST(request: Request) {
  try {
    console.log('Starting wallet creation process...');

    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_OPAY_HOST_URL ||
      !process.env.OPAY_MERCHANT_ID ||
      !process.env.OPAY_SECRET_KEY ||
      !process.env.OPAY_SALT_INDEX
    ) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing OPAY environment variables' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Request Body:', body);

    const { name, refId, email, phone, accountType = 'Merchant', sendPassWordFlag = 'N' } = body;

    // Validate required fields
    if (!name || !accountType || !(refId || email || phone)) {
      console.error('Validation failed: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, accountType, and at least one of refId, email, or phone' },
        { status: 400 }
      );
    }

    // Prepare base payload
    const basePayload = {
      opayMerchantId: process.env.OPAY_MERCHANT_ID,
      name,
      refId: refId || `ref_${Date.now()}`,
      email: email || '',
      phone: phone || '',
      accountType,
      sendPassWordFlag,
    };

    // Generate HMAC signature
    const timestamp = Date.now().toString();
    const saltIndex = process.env.OPAY_SALT_INDEX;
    const secretKey = process.env.OPAY_SECRET_KEY;
    const stringToSign = `${JSON.stringify(basePayload)}${timestamp}${secretKey}${saltIndex}`;
    const signature = CryptoJS.HmacSHA256(stringToSign, secretKey).toString(CryptoJS.enc.Hex);
    console.log('Generated HMAC Signature:', '[REDACTED]');
    console.log('Timestamp:', timestamp);

    // Add signature to payload
    const payload = {
      ...basePayload,
      sign: signature, // Critical: Add sign to the payload
    };
    console.log("thsi",signature)
    console.log('Prepared payload with sign:', { ...payload, sign: '[REDACTED]' });

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'clientAuthKey': process.env.OPAY_SECRET_KEY,
      'version': '2',
      'bodyFormat': 'JSON',
      'MerchantId': process.env.OPAY_MERCHANT_ID,
      'X-Timestamp': timestamp,
      'X-Signature': signature, // Keep in headers as well
      'User-Agent': 'OPay-WAAS-App/1.0',
    };
    console.log('Request Headers:', { ...headers, clientAuthKey: '[REDACTED]', 'X-Signature': '[REDACTED]' });

    // Call OPay API
    const endpoint = `${process.env.NEXT_PUBLIC_OPAY_HOST_URL}/api/v2/third/depositcode/generateStaticDepositCode`;
    console.log('Calling endpoint:', endpoint);

    const response = await axios.post(endpoint, payload, { headers, timeout: 10000 });
    console.log('API response:', response.data);

    if (response.data.code !== '00000') {
      console.error('OPay API error:', response.data.message);
      throw new Error(response.data.message || 'Failed to create wallet');
    }

    console.log('Wallet creation successful');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Full error details:', {
      message: error.message,
      response: error.response?.data || 'No response data',
      status: error.response?.status || 'No status',
    });
    return NextResponse.json(
      { error: 'Failed to create wallet', details: error.message },
      { status: error.response?.status || 500 }
    );
  }
}