import { NextResponse } from 'next/server';
import axios, { AxiosResponse } from 'axios';
import NodeRSA from 'node-rsa';
import { KEYUTIL, KJUR, hextob64 } from 'jsrsasign';

// Define payload interface for type safety
interface WalletCreationPayload {
  name: string;
  refId?: string;
  email?: string;
  phone?: string;
  accountType?: string;
  sendPassWordFlag?: string;
}

// OPay public key (replace with actual key from OPay dashboard)
const OPAY_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
[Replace with OPay's public key from sandbox dashboard]
-----END PUBLIC KEY-----
`;

// Merchant private key (replace with your generated private key)
const MERCHANT_PRIVATE_KEY = `
-----BEGIN PRIVATE KEY-----
[Replace with your generated private key]
-----END PRIVATE KEY-----
`;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log('Starting wallet creation process...');

    // Log environment variables (mask sensitive data)
    console.log('Environment Variables:', {
      hostUrl: process.env.NEXT_PUBLIC_OPAY_HOST_URL || 'MISSING',
      merchantId: process.env.OPAY_MERCHANT_ID ? '[REDACTED]' : 'MISSING',
      secretKey: process.env.OPAY_SECRET_KEY ? '[REDACTED]' : 'MISSING',
      publicKey: process.env.NEXT_PUBLIC_OPAY_PUBLIC_KEY ? '[REDACTED]' : 'MISSING',
    });

    // Debug: Log clientAuthKey prefix
    console.log('clientAuthKey prefix:', process.env.OPAY_SECRET_KEY?.substring(0, 8) || 'MISSING');

    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_OPAY_HOST_URL ||
      !process.env.OPAY_MERCHANT_ID ||
      !process.env.OPAY_SECRET_KEY
    ) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing OPAY environment variables' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: WalletCreationPayload = await request.json();
    console.log('Request Body:', body);

    const {
      name,
      refId,
      email,
      phone,
      accountType = 'Merchant',
      sendPassWordFlag = 'N',
    } = body;

    // Validate required fields
    if (!name || !accountType || !(refId || email || phone)) {
      console.error('Validation failed: Missing required fields');
      return NextResponse.json(
        {
          error: 'Missing required fields: name, accountType, and at least one of refId, email, or phone',
        },
        { status: 400 }
      );
    }

    // Prepare paramContent
    const paramContent = {
      opayMerchantId: process.env.OPAY_MERCHANT_ID,
      name,
      refId: refId || `ref_${Date.now()}`,
      email: email || '',
      phone: phone || '',
      accountType,
      sendPassWordFlag,
    };

    // Encrypt paramContent with OPay public key
    const rsa = new NodeRSA({ b: 1024 });
    rsa.setOptions({ encryptionScheme: { scheme: 'pkcs1' } });
    rsa.importKey(OPAY_PUBLIC_KEY, 'pkcs8-public-pem');
    const encryptedParamContent = rsa.encrypt(JSON.stringify(paramContent), 'base64');

    // Generate signature with merchant private key
    const timestamp = Date.now().toString();
    const stringToSign = encryptedParamContent + timestamp;
    const rsaSign = KEYUTIL.getKey(MERCHANT_PRIVATE_KEY);
    const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
    sig.init(rsaSign);
    sig.updateString(stringToSign);
    const signature = hextob64(sig.sign());
    console.log('Generated RSA Signature:', '[REDACTED]');
    console.log('Timestamp:', timestamp);

    // Prepare payload
    const payload = {
      paramContent: encryptedParamContent,
      sign: signature,
    };
    console.log('Prepared payload:', { ...payload, sign: '[REDACTED]' });

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'clientAuthKey': process.env.OPAY_SECRET_KEY,
      'version': 'V1.0.1',
      'bodyFormat': 'JSON',
      'timestamp': timestamp,
      'MerchantId': process.env.OPAY_MERCHANT_ID,
      'User-Agent': 'OPay-WAAS-App/1.0',
    };
    console.log('Request Headers:', { ...headers, clientAuthKey: '[REDACTED]' });

    // Call OPay API with retry logic
    const endpoint = `${process.env.NEXT_PUBLIC_OPAY_HOST_URL}/api/v2/third/depositcode/generateStaticDepositCode`;
    console.log('Calling endpoint:', endpoint);

    let response: AxiosResponse;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        response = await axios.post(endpoint, payload, {
          headers,
          timeout: 10000, // 10-second timeout
        });
        break; // Exit loop if successful
      } catch (error: any) {
        if (error.code === 'ENOTFOUND') {
          console.error(`DNS resolution error (attempt ${retryCount + 1}/${maxRetries}), retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          retryCount++;
        } else {
          throw error; // Re-throw other errors
        }
      }
    }

    if (!response) {
      throw new Error('Failed to create wallet after maximum retries');
    }

    console.log('API response:', response.data);
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);

    if (response.data.code !== '00000') {
      console.error('OPay API error:', response.data.message);
      throw new Error(response.data.message || 'Failed to create wallet');
    }

    // Decrypt response data (if needed)
    const responseRsa = new NodeRSA(MERCHANT_PRIVATE_KEY);
    responseRsa.setOptions({ encryptionScheme: { scheme: 'pkcs1' } });
    const decryptedData = responseRsa.decrypt(response.data.data, 'utf8');
    const responseData = JSON.parse(decryptedData);
    console.log('Decrypted response data:', responseData);

    console.log('Wallet creation successful');
    return NextResponse.json({ ...response.data, data: responseData });
  } catch (error: any) {
    console.error('Full error details:', {
      message: error.message,
      response: error.response?.data || 'No response data',
      status: error.response?.status || 'No status',
    });
    return NextResponse.json(
      {
        error: 'Failed to create wallet',
        details: error.response?.data?.message || error.message,
        code: error.response?.data?.code || 'UNKNOWN_ERROR',
      },
      { status: error.response?.status || 500 }
    );
  }
}