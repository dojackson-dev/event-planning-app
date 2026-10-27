'use client'

import { useCallback, useEffect, useState } from 'react'

const SEEN_KEY = 'eventecos:splash-seen'
// The logo fades in and then back, the words come up over it, then the whole screen fades away.
const HOLD_MS = 3800
const FADE_MS = 600

/** Opening screen: a big logo that fades back, then "Powering The Event Ecosystem". Plays once per browser session. */
export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'leaving' | 'gone'>('show')

  const finish = useCallback(() => {
    setPhase(current => (current === 'show' ? 'leaving' : current))
  }, [])

  useEffect(() => {
    let seen = false
    try { seen = window.sessionStorage.getItem(SEEN_KEY) === '1' } catch { /* storage blocked: just play it */ }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (seen || reduced) {
      setPhase('gone')
      return
    }
    try { window.sessionStorage.setItem(SEEN_KEY, '1') } catch { /* not remembered: plays again next load */ }

    const leave = window.setTimeout(finish, HOLD_MS)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(leave)
      window.removeEventListener('keydown', onKey)
    }
  }, [finish])

  useEffect(() => {
    if (phase !== 'leaving') return
    const done = window.setTimeout(() => setPhase('gone'), FADE_MS)
    return () => window.clearTimeout(done)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div
      id="ee-splash"
      aria-hidden="true"
      onClick={finish}
      style={{ transition: `opacity ${FADE_MS}ms ease`, opacity: phase === 'leaving' ? 0 : 1 }}
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center overflow-hidden bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lib/EventEcos-Logo.jpg"
        alt=""
        className="ee-splash-logo select-none object-contain"
        style={{ width: 'min(88vw, 88vh)', height: 'min(88vw, 88vh)' }}
        draggable={false}
      />
      <p className="ee-splash-words absolute inset-x-0 whitespace-nowrap px-3 text-center font-semibold tracking-wide text-[#2d3693]">
        Powering The Event Ecosystem
      </p>
    </div>
  )
}
