'use client'

import { useCallback, useEffect, useState } from 'react'
import { callsRequest, TokenGetter } from '@/lib/calls'

interface StaffMember {
  userId: string
  kind: 'admin' | 'sales'
  name: string
  email: string | null
  callingEnabled: boolean
  receivesInbound: boolean
  mobile: string | null
  mobileVerified: boolean
}

type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
type DayHours = { open: string; close: string } | null

interface Settings {
  business_hours: { timezone: string; days: Record<DayKey, DayHours> }
  allowed_country_codes: string[]
  max_calls_per_hour: number
  voicemail_greeting: string
}

const DAYS: Array<[DayKey, string]> = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
]

const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-40"
    />
  )
}

function StaffTable({ getToken }: { getToken: TokenGetter }) {
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await callsRequest<{ staff: StaffMember[] }>(getToken, 'get', '/admin/staff')
      setStaff(res.staff)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const update = async (userId: string, patch: { callingEnabled?: boolean; receivesInbound?: boolean }) => {
    setSavingId(userId)
    setError('')
    try {
      const res = await callsRequest<{ staff: StaffMember[] }>(getToken, 'patch', `/admin/staff/${userId}`, patch)
      setStaff(res.staff)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">Who can call</h2>
      <p className="mt-1 text-sm text-gray-600">
        Turn calling on for each person. Incoming calls ring everyone marked below at once; whoever presses 1
        first takes the call. A verified cell phone is required for both.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {staff === null && !error && <p className="mt-3 text-sm text-gray-500">Loading…</p>}
      {staff?.length === 0 && <p className="mt-3 text-sm text-gray-500">No sales reps yet.</p>}
      {staff && staff.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4">Person</th>
                <th className="py-2 pr-4">Cell phone</th>
                <th className="py-2 pr-4">Can place calls</th>
                <th className="py-2">Takes incoming calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.userId}>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <span className="block text-xs text-gray-500">
                      {s.kind === 'admin' ? 'Admin' : 'Sales'}
                      {s.email ? ` · ${s.email}` : ''}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-700">{s.mobileVerified ? s.mobile : 'Not verified'}</td>
                  <td className="py-2 pr-4">
                    <Toggle
                      checked={s.callingEnabled}
                      disabled={savingId === s.userId || s.kind === 'admin'}
                      label={`Allow ${s.name} to place calls`}
                      onChange={(v) => update(s.userId, { callingEnabled: v })}
                    />
                  </td>
                  <td className="py-2">
                    <Toggle
                      checked={s.receivesInbound}
                      disabled={savingId === s.userId || !s.callingEnabled || !s.mobileVerified}
                      label={`Ring ${s.name} for incoming calls`}
                      onChange={(v) => update(s.userId, { receivesInbound: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SettingsForm({ getToken }: { getToken: TokenGetter }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [codes, setCodes] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    callsRequest<Settings>(getToken, 'get', '/admin/settings')
      .then((s) => {
        setSettings(s)
        setCodes(s.allowed_country_codes.join(', '))
      })
      .catch((e: Error) => setError(e.message))
  }, [getToken])

  if (!settings) {
    return error ? (
      <p className="text-sm text-red-600" role="alert">
        {error}
      </p>
    ) : (
      <p className="text-sm text-gray-500">Loading settings…</p>
    )
  }

  const setDay = (day: DayKey, value: DayHours) =>
    setSettings({
      ...settings,
      business_hours: { ...settings.business_hours, days: { ...settings.business_hours.days, [day]: value } },
    })

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const allowed = codes
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const next = await callsRequest<Settings>(getToken, 'put', '/admin/settings', {
        ...settings,
        allowed_country_codes: allowed,
      })
      setSettings(next)
      setCodes(next.allowed_country_codes.join(', '))
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">Business hours and limits</h2>
      <p className="mt-1 text-sm text-gray-600">
        Outside these hours, incoming calls go straight to shared voicemail.
      </p>

      <div className="mt-4">
        <label htmlFor="call-tz" className="block text-xs font-medium text-gray-700">
          Time zone
        </label>
        <select
          id="call-tz"
          value={settings.business_hours.timezone}
          onChange={(e) =>
            setSettings({ ...settings, business_hours: { ...settings.business_hours, timezone: e.target.value } })
          }
          className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {[...new Set([settings.business_hours.timezone, ...TIME_ZONES])].map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {DAYS.map(([key, label]) => {
          const day = settings.business_hours.days[key]
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex w-32 items-center gap-2 text-gray-800">
                <input
                  type="checkbox"
                  checked={day !== null}
                  onChange={(e) => setDay(key, e.target.checked ? { open: '09:00', close: '17:00' } : null)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                {label}
              </label>
              {day ? (
                <>
                  <input
                    type="time"
                    aria-label={`${label} opens`}
                    value={day.open}
                    onChange={(e) => setDay(key, { ...day, open: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    aria-label={`${label} closes`}
                    value={day.close}
                    onChange={(e) => setDay(key, { ...day, close: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                </>
              ) : (
                <span className="text-gray-500">Closed</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="call-codes" className="block text-xs font-medium text-gray-700">
            Countries staff may call (country codes)
          </label>
          <input
            id="call-codes"
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
            placeholder="+1"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Example: +1, +44. Premium-rate numbers are always blocked.</p>
        </div>
        <div>
          <label htmlFor="call-max" className="block text-xs font-medium text-gray-700">
            Calls per person per hour
          </label>
          <input
            id="call-max"
            type="number"
            min={1}
            max={200}
            value={settings.max_calls_per_hour}
            onChange={(e) => setSettings({ ...settings, max_calls_per_hour: Number(e.target.value) })}
            className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="call-greeting" className="block text-xs font-medium text-gray-700">
          Voicemail greeting (read aloud to callers)
        </label>
        <textarea
          id="call-greeting"
          rows={2}
          maxLength={300}
          value={settings.voicemail_greeting}
          onChange={(e) => setSettings({ ...settings, voicemail_greeting: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="mt-3 text-sm text-green-700">Saved.</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </section>
  )
}

export default function CallsAdminPanel({ getToken }: { getToken: TokenGetter }) {
  return (
    <div className="space-y-6">
      <StaffTable getToken={getToken} />
      <SettingsForm getToken={getToken} />
    </div>
  )
}
