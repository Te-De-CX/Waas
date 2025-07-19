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

// OPay RSA public key (must be PEM format from sandbox dashboard)
const OPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_OPAY_RSA_PUBLIC_KEY || '';

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
      rsaPublicKey: process.env.NEXT_PUBLIC_OPAY_RSA_PUBLIC_KEY ? '[REDACTED]' : 'MISSING',
      publicKeyIdentifier: process.env.NEXT_PUBLIC_OPAY_PUBLIC_KEY ? '[REDACTED]' : 'MISSING',
    });

    // Debug: Log clientAuthKey and OPay public key status
    console.log('clientAuthKey prefix:', process.env.OPAY_SECRET_KEY?.substring(0, 8) || 'MISSING');
    console.log('OPAY_PUBLIC_KEY defined:', !!OPAY_PUBLIC_KEY);
    console.log('OPAY_PUBLIC_KEY snippet:', OPAY_PUBLIC_KEY ? OPAY_PUBLIC_KEY.substring(0, 20) + '...' : 'EMPTY');

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

    // Validate OPay RSA public key
    if (!OPAY_PUBLIC_KEY || !OPAY_PUBLIC_KEY.includes('BEGIN PUBLIC KEY')) {
      console.error('OPAY_PUBLIC_KEY is not configured or invalid (must be PEM format)');
      return NextResponse.json(
        {
          error: 'Server configuration error: OPAY_PUBLIC_KEY not configured or invalid',
          details: 'Please set NEXT_PUBLIC_OPAY_RSA_PUBLIC_KEY in .env.local with a valid PEM-formatted RSA public key from the OPay sandbox dashboard',
        },
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

    // Prepare minimal paramContent
    const paramContent = {
      opayMerchantId: process.env.OPAY_MERCHANT_ID,
      name,
      refId: refId || `ref_${Date.now()}`,
      email: email || '',
      phone: phone || '',
      accountType,
      sendPassWordFlag,
    };

    // Convert to JSON and log size
    const paramContentJson = JSON.stringify(paramContent);
    console.log('Plain paramContent:', paramContentJson);
    console.log('Plain paramContent length:', paramContentJson.length);

    // Encrypt paramContent with OPay public key
    let encryptedParamContent: string;
    try {
      const rsa = new NodeRSA();
      try {
        rsa.importKey(OPAY_PUBLIC_KEY, 'pkcs8-public-pem');
      } catch (keyImportError: any) {
        console.error('Failed to import OPAY_PUBLIC_KEY:', keyImportError.message);
        throw new Error('Invalid OPAY_PUBLIC_KEY format: ' + keyImportError.message);
      }
      rsa.setOptions({ encryptionScheme: 'pkcs1' });
      encryptedParamContent = rsa.encrypt(paramContentJson, 'base64');
      console.log('Encrypted paramContent length:', encryptedParamContent.length);
    } catch (encryptionError: any) {
      console.error('Encryption failed:', encryptionError.message);
      throw new Error('Failed to encrypt paramContent: ' + encryptionError.message);
    }

    // Generate signature with merchant private key
    const timestamp = Date.now().toString();
    const stringToSign = encryptedParamContent + timestamp;
    let signature: string;
    try {
      const rsaSign = KEYUTIL.getKey(MERCHANT_PRIVATE_KEY);
      const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
      sig.init(rsaSign);
      sig.updateString(stringToSign);
      signature = hextob64(sig.sign());
      console.log('Generated RSA Signature:', '[REDACTED]');
    } catch (signingError: any) {
      console.error('Signature generation failed:', signingError.message);
      throw new Error('Failed to generate signature: ' + signingError.message);
    }
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

    // Decrypt response data
    let responseData: any = {};
    if (response.data.data) {
      try {
        const responseRsa = new NodeRSA(MERCHANT_PRIVATE_KEY);
        responseRsa.setOptions({ encryptionScheme: 'pkcs1' });
        const decryptedData = responseRsa.decrypt(response.data.data, 'utf8');
        responseData = JSON.parse(decryptedData);
        console.log('Decrypted response data:', responseData);
      } catch (decryptionError: any) {
        console.error('Decryption failed:', decryptionError.message);
        throw new Error('Failed to decrypt response data: ' + decryptionError.message);
      }
    }

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
        details: error.message,
        code: error.response?.data?.code || 'UNKNOWN_ERROR',
      },
      { status: error.response?.status || 500 }
    );
  }
}