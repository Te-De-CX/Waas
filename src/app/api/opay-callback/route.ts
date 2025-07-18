import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const headers = request.headers;
    const merchantId = headers.get('merchantId');
    const tranId = headers.get('X-Opay-Tranid');

    if (merchantId !== process.env.OPAY_MERCHANT_ID) {
      throw new Error('Invalid merchant ID');
    }

    const callbackData = await request.json();
    const { status, transactionId, depositCode, depositAmount, currency } = callbackData;

    console.log('OPay Webhook:', {
      transactionId,
      depositCode,
      status,
      depositAmount,
      currency,
      tranId,
    });

    // TODO: Update your database with transaction status
    // Example: await updateTransaction(transactionId, status, depositAmount);

    return NextResponse.json({ code: '00000', message: 'SUCCESSFUL' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { code: '99999', message: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}