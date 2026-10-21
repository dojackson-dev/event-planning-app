'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { errorMessage } from '../lib'

/** Loads a read-only report endpoint with loading, error and reload handling. */
export function useReport<T>(path: string, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<T>(path)
      setData(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load this report.'))
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}

export function ReportState({ loading, error, onRetry, empty, emptyText }: { loading: boolean; error: string | null; onRetry: () => void; empty: boolean; emptyText: string }) {
  if (loading) return <p className="py-10 text-center text-sm text-gray-500">Loading...</p>
  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}{' '}
        <button onClick={onRetry} className="font-medium underline">Try again</button>
      </div>
    )
  }
  if (empty) return <p className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">{emptyText}</p>
  return null
}
