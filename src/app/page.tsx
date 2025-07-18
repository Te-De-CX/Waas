'use client'

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositCode, setDepositCode] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const createWallet = async () => {
    setLoading(true);
    setError(null);
    console.log('Initiating wallet creation...');

    try {
      const payload = {
        name: 'Test User',
        refId: `ref_${Date.now()}`,
        email: 'testuser@opay.com',
        phone: '+2341234567890',
        accountType: 'Merchant',
        sendPassWordFlag: 'N',
      };
      console.log('Sending payload to /api/opay-wallet/create:', payload);

      const response = await axios.post('/api/opay-wallet/create', payload);
      console.log('API Response:', response.data);

      const { depositCode } = response.data.data;
      setDepositCode(depositCode);
      console.log('Wallet created successfully, depositCode:', depositCode);
    } catch (err: any) {
      console.error('Wallet creation failed:', {
        message: err.message,
        response: err.response ? err.response.data : 'No response',
        status: err.response ? err.response.status : 'No status',
      });
      setError('Failed to create wallet. Please try again. Check logs for details.');
    } finally {
      setLoading(false);
    }
  };

  const queryBalance = async () => {
    if (!depositCode) {
      setError('Create a wallet first.');
      console.log('Balance query failed: No depositCode');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('Querying balance for depositCode:', depositCode);

    try {
      const response = await axios.post('/api/opay-wallet/balance', {
        depositCode,
      });
      console.log('Balance query response:', response.data);

      const { amount, currency } = response.data.data;
      setBalance(`${amount} ${currency}`);
      console.log('Balance retrieved:', `${amount} ${currency}`);
    } catch (err: any) {
      console.error('Balance query failed:', {
        message: err.message,
        response: err.response ? err.response.data : 'No response',
        status: err.response ? err.response.status : 'No status',
      });
      setError('Failed to query balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">OPay WAAS Sandbox</h1>
        <button
          onClick={createWallet}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 mr-2"
        >
          {loading ? 'Processing...' : 'Create Wallet'}
        </button>
        <button
          onClick={queryBalance}
          disabled={loading || !depositCode}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Check Balance'}
        </button>
        {depositCode && (
          <p className="text-green-500 mt-2">Wallet Created: {depositCode}</p>
        )}
        {balance && <p className="text-blue-500 mt-2">Balance: {balance}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}