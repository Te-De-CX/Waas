import { NextApiRequest, NextApiResponse } from 'next';
import { makeOpayRequest } from '../../../lib/opay';

interface CreateWalletRequest {
  name: string;
  refId?: string;
  email?: string;
  phone?: string;
  accountType: 'Merchant' | 'User';
  sendPassWordFlag?: 'Y' | 'N';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      refId,
      email,
      phone,
      accountType,
      sendPassWordFlag = 'N',
    } = req.body as CreateWalletRequest;

    // Validate at least one identifier is provided
    if (!refId && !email && !phone) {
      return res.status(400).json({
        error: 'At least one of refId, email, or phone must be provided',
      });
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

    const response = await makeOpayRequest<{
      depositCode: string;
      name: string;
      refId?: string;
      emailOrPhone: string;
      accountType: string;
    }>('/api/v2/third/depositcode/generateStaticDepositCode', payload);

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error('Create wallet error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create wallet',
    });
  }
}