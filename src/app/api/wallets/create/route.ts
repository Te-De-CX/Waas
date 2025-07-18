import { NextResponse } from 'next/server';
import { makeOpayRequest, Wallet } from '@/lib/opay';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Add validation
    if (!requestData) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const {
      name,
      refId,
      email,
      phone,
      accountType,
      sendPassWordFlag = 'N',
    } = requestData;

    if (!name || !accountType) {
      return NextResponse.json(
        { error: 'Name and accountType are required' },
        { status: 400 }
      );
    }

    if (!refId && !email && !phone) {
      return NextResponse.json(
        { error: 'At least one of refId, email, or phone must be provided' },
        { status: 400 }
      );
    }

    const payload = {
      opayMerchantId: process.env.OPAY_MERCHANT_ID,
      name,
      refId,
      email,
      phone,
      accountType,
      sendPassWordFlag,
    };

    console.log('Creating wallet with payload:', payload); // Debug log

    const response = await makeOpayRequest<Wallet>(
      '/api/v2/third/depositcode/generateStaticDepositCode',
      payload
    );

    return NextResponse.json({ 
      success: true, 
      data: response.data 
    });
  } catch (error: any) {
    console.error('Create wallet error details:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create wallet',
        details: error.details || null,
      },
      { status: 500 }
    );
  }
}