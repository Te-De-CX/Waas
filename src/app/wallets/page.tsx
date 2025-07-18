import Link from 'next/link';

export default function WalletsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">OPay Digital Wallets</h1>
        <Link
          href="/wallets/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Create New Wallet
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Your wallets will appear here. Create your first wallet to get started.</p>
      </div>
    </div>
  );
}