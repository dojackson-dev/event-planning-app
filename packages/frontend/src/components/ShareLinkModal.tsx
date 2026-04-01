'use client'

import { useState } from 'react'
import { X, Copy, Check, ExternalLink, Lock, MessageSquare } from 'lucide-react'

interface ShareLinkModalProps {
  isOpen: boolean
  onClose: () => void
  shareToken: string
  arrivalToken: string
  accessCode: string
  eventName?: string
  onSmsClient?: () => Promise<void>
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  shareToken,
  arrivalToken,
  accessCode,
  eventName,
  onSmsClient,
}: ShareLinkModalProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [smsError, setSmsError] = useState<string | null>(null)

  if (!isOpen) return null

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const editLink = `${baseUrl}/guest-list/share/${shareToken}`
  const doorLink = `${baseUrl}/guest-list/arrival/${arrivalToken}`

  const copyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(item)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Share Guest List</h2>
            {eventName && (
              <p className="text-sm text-gray-600 mt-1">{eventName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Combined Share Button */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-5 text-white">
            <p className="text-sm font-medium mb-1 opacity-90">Quick share — link &amp; code together</p>
            <p className="text-xs opacity-75 mb-4">Copies a ready-to-send message with the link and access code in one tap</p>
            <button
              onClick={() => copyToClipboard(
                `You've been invited to view and edit the guest list!\n\nLink: ${editLink}\nAccess Code: ${accessCode}\n\nOpen the link and enter the code to get started.`,
                'combined'
              )}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
            >
              {copiedItem === 'combined' ? (
                <><Check className="w-5 h-5" /> Copied! Send it now</>
              ) : (
                <><Copy className="w-5 h-5" /> Copy Link &amp; Code Together</>
              )}
            </button>
            {onSmsClient && (
              <div className="mt-3">
                <button
                  onClick={async () => {
                    setSmsLoading(true)
                    setSmsError(null)
                    try {
                      await onSmsClient()
                      setSmsSent(true)
                      setTimeout(() => setSmsSent(false), 4000)
                    } catch (err: any) {
                      setSmsError(err?.message || 'Failed to send SMS')
                    } finally {
                      setSmsLoading(false)
                    }
                  }}
                  disabled={smsLoading || smsSent}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60"
                >
                  {smsSent ? (
                    <><Check className="w-5 h-5" /> SMS Sent to Client!</>
                  ) : smsLoading ? (
                    'Sending SMS...'
                  ) : (
                    <><MessageSquare className="w-5 h-5" /> SMS Link &amp; Code to Client</>
                  )}
                </button>
                {smsError && (
                  <p className="text-xs text-red-200 mt-1 text-center">{smsError}</p>
                )}
              </div>
            )}
          </div>
          {/* Access Code Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Access Code</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share this code with guests so they can access the door list
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white px-4 py-3 rounded-md border-2 border-purple-300">
                <span className="text-2xl font-bold font-mono text-purple-700 tracking-wider">
                  {accessCode}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(accessCode, 'code')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                {copiedItem === 'code' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Edit Link Section */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Guest Edit Link</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share this link with the client or associates to view and edit the guest list. 
              They will need the access code above.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white px-4 py-2 rounded-md border border-blue-300 overflow-hidden">
                <span className="text-sm text-gray-700 break-all font-mono">
                  {editLink}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(editLink, 'edit')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {copiedItem === 'edit' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Door List Link Section */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Door List / Arrival Tracking</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share this link with security personnel to track guest arrivals. 
              They will need the access code above.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white px-4 py-2 rounded-md border border-green-300 overflow-hidden">
                <span className="text-sm text-gray-700 break-all font-mono">
                  {doorLink}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(doorLink, 'door')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                {copiedItem === 'door' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">How to Share:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Tap <strong>Copy Link &amp; Code Together</strong> above and paste into a text or email</li>
              <li>Or copy the link and code separately using the buttons below</li>
              <li>Recipients need both the link AND the access code to access the list</li>
              <li>Lock the guest list when you want to prevent further edits</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
