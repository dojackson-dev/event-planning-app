'use client'

export default function ContractsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Contracts</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Contract management interface coming soon. This will allow you to:
        </p>
        <ul className="mt-4 space-y-2 text-gray-600">
          <li>• Upload and manage contracts for each booking</li>
          <li>• Track contract status (sent/signed)</li>
          <li>• Send contracts to customers for e-signature</li>
          <li>• View signing history and timestamps</li>
          <li>• Download signed contracts</li>
        </ul>
      </div>
    </div>
  )
}
