'use client'

import { analytics } from '@heycatch/sdk'

// Module scope so init runs once, before hydration, on every page.
analytics.init({
  projectKey: 'hck_pk_emZrUQQYGZQ6CpcDmSSqUY0lAIfb9FZ2',
  install: {
    framework: 'nextjs',
    frameworkVersion: '14',
    agent: 'other',
  },
})

export default function HeyCatchInit() {
  return null
}
