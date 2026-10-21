'use client'

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Single 6-digit field; works with SMS/email autofill. */
export default function OtpInput({ id, label, value, onChange, disabled }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        disabled={disabled}
        placeholder="123456"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.4em] focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50"
      />
    </div>
  )
}
