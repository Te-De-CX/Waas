'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateWalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    refId: '',
    email: '',
    phone: '',
    accountType: 'Merchant' as 'Merchant' | 'User',
    sendPassWordFlag: 'N' as 'Y' | 'N',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate at least one identifier is provided
      if (!formData.refId && !formData.email && !formData.phone) {
        throw new Error('At least one of Ref ID, Email, or Phone must be provided');
      }

      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create wallet');
      }

      const data = await response.json();
      setWalletData(data.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create OPay Digital Wallet</h1>
        <Link href="/wallets" className="text-blue-600 hover:underline">
          Back to Wallets
        </Link>
      </div>
      
      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Wallet Created Successfully!</h2>
          <div className="mt-2 space-y-1">
            <p><span className="font-semibold">Deposit Code:</span> {walletData?.depositCode}</p>
            <p><span className="font-semibold">Name:</span> {walletData?.name}</p>
            <p><span className="font-semibold">Account Type:</span> {walletData?.accountType}</p>
            <p><span className="font-semibold">Email/Phone:</span> {walletData?.emailOrPhone}</p>
          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => router.push('/wallets')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              View All Wallets
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  name: '',
                  refId: '',
                  email: '',
                  phone: '',
                  accountType: 'Merchant',
                  sendPassWordFlag: 'N',
                });
              }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Create Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Holder Name*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ref ID (optional)
            </label>
            <input
              type="text"
              name="refId"
              value={formData.refId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={15}
              placeholder="15 characters max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="2341234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type*
            </label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Merchant">Merchant (direct to company account)</option>
              <option value="User">User (stays in wallet)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send Password Credentials
            </label>
            <select
              name="sendPassWordFlag"
              value={formData.sendPassWordFlag}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Create Wallet'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}