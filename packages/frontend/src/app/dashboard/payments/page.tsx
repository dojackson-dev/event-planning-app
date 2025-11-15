'use client'

export default function PaymentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Payments</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Payment tracking interface coming soon. This will allow you to:
        </p>
        <ul className="mt-4 space-y-2 text-gray-600">
          <li>• View all payment transactions</li>
          <li>• Track payment status (pending/paid/refunded)</li>
          <li>• Process refunds when needed</li>
          <li>• Generate payment reports</li>
          <li>• Send payment reminders to customers</li>
          <li>• Export payment data for accounting</li>
          <li>• Integrate with Stripe payment gateway</li>
        </ul>
      </div>
    </div>
  )
}
