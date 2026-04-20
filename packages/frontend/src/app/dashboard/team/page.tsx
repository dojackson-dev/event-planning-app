'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { UserRole } from '@/types'
import { Users, UserPlus, Trash2, X, Mail, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface TeamMember {
  id: string              // membership id
  role: string
  joined_at: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

interface TeamInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

export default function TeamPage() {
  const { activeRole } = useAuth()
  const router = useRouter()

  const [members, setMembers]           = useState<TeamMember[]>([])
  const [invitations, setInvitations]   = useState<TeamInvitation[]>([])
  const [loading, setLoading]           = useState(true)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviting, setInviting]         = useState(false)
  const [inviteError, setInviteError]   = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [removingId, setRemovingId]     = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Associates cannot manage team
  useEffect(() => {
    if (activeRole === UserRole.ASSOCIATE) {
      router.replace('/dashboard')
    }
  }, [activeRole, router])

  const load = async () => {
    try {
      setLoading(true)
      const [membersRes, invitesRes] = await Promise.all([
        api.get('/team/members'),
        api.get('/team/invitations'),
      ])
      setMembers(membersRes.data ?? [])
      setInvitations(invitesRes.data ?? [])
    } catch (err: any) {
      console.error('Failed to load team data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    if (!inviteEmail.trim()) return
    try {
      setInviting(true)
      await api.post('/team/invite', { email: inviteEmail.trim() })
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      load()
    } catch (err: any) {
      setInviteError(err?.response?.data?.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string, name: string) => {
    if (!confirm(`Remove ${name} from your team? They will lose access immediately.`)) return
    try {
      setRemovingId(memberUserId)
      await api.delete(`/team/members/${memberUserId}`)
      setMembers(prev => prev.filter(m => m.user.id !== memberUserId))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Cancel the invitation to ${email}?`)) return
    try {
      setCancellingId(inviteId)
      await api.delete(`/team/invitations/${inviteId}`)
      setInvitations(prev => prev.filter(i => i.id !== inviteId))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel invitation')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="h-7 w-7 text-primary-600" />
          Team Members
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite associates to view your venue dashboard. Associates can see everything except billing and account settings.
        </p>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary-600" />
          Invite an Associate
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@email.com"
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
        {inviteSuccess && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {inviteSuccess}
          </div>
        )}
        {inviteError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {inviteError}
          </div>
        )}
      </div>

      {/* Active Members */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Active Members{' '}
            {!loading && <span className="text-gray-400 font-normal text-sm">({members.length})</span>}
          </h2>
        </div>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No team members yet. Invite someone above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map(member => {
              const fullName = `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim()
              return (
              <li key={member.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {member.user.first_name?.[0] || '?'}{member.user.last_name?.[0] || ''}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fullName || member.user.email}</p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    {member.role}
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.user.id, fullName || member.user.email)}
                    disabled={removingId === member.user.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pending Invitations */}
      {(loading || invitations.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Pending Invitations{' '}
              {!loading && <span className="text-gray-400 font-normal text-sm">({invitations.length})</span>}
            </h2>
          </div>
          {loading ? (
            <div className="px-6 py-6 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {invitations.map(invite => (
                <li key={invite.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {new Date(invite.created_at).toLocaleDateString()}
                        {' · '}Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                      pending
                    </span>
                    <button
                      onClick={() => handleCancelInvite(invite.id, invite.email)}
                      disabled={cancellingId === invite.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
