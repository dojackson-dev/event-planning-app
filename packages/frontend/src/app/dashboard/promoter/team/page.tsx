'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { Users, UserPlus, Trash2, X, Mail, CheckCircle, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

interface TeamMember {
  id: string
  role: 'admin' | 'staff'
  created_at: string
  user: { id: string; email: string; first_name: string; last_name: string } | null
}

interface TeamInvitation {
  id: string
  email: string
  role: 'admin' | 'staff'
  created_at: string
  expires_at: string
}

interface Me {
  role: 'owner' | 'admin' | 'staff' | null
  accountName?: string | null
  maxTeamSize?: number
}

const ROLE_HELP: Record<'admin' | 'staff', string> = {
  admin: 'Manage events, tickets, bookings and invoices. Cannot manage the team, payouts or account settings.',
  staff: 'View events and attendees and scan tickets at the door. Cannot make changes.',
}

export default function PromoterTeamPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const meRes = await api.get('/promoter-team/me')
      setMe(meRes.data)
      if (meRes.data?.role === 'owner') {
        const [membersRes, invitesRes] = await Promise.all([
          api.get('/promoter-team/members'),
          api.get('/promoter-team/invitations'),
        ])
        setMembers(membersRes.data ?? [])
        setInvitations(invitesRes.data ?? [])
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load your team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const maxTeamSize = me?.maxTeamSize ?? 3
  const used = members.length + invitations.length
  const full = used >= maxTeamSize

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    const email = inviteEmail.trim()
    if (!email) return
    try {
      setInviting(true)
      const res = await api.post('/promoter-team/invite', { email, role: inviteRole })
      setInviteSuccess(res.data?.message || `Invitation sent to ${email}`)
      setInviteEmail('')
      load()
    } catch (err: any) {
      setInviteError(err?.response?.data?.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (member: TeamMember) => {
    const name = `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() || member.user?.email || 'this person'
    if (!confirm(`Remove ${name} from your team? They will lose access immediately.`)) return
    try {
      setBusyId(member.id)
      await api.delete(`/promoter-team/members/${member.id}`)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove team member')
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (invite: TeamInvitation) => {
    if (!confirm(`Cancel the invitation to ${invite.email}?`)) return
    try {
      setBusyId(invite.id)
      await api.delete(`/promoter-team/invitations/${invite.id}`)
      setInvitations(prev => prev.filter(i => i.id !== invite.id))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel invitation')
    } finally {
      setBusyId(null)
    }
  }

  const handleResend = async (invite: TeamInvitation) => {
    try {
      setBusyId(invite.id)
      await api.post(`/promoter-team/invitations/${invite.id}/resend`)
      setInviteSuccess(`Invitation resent to ${invite.email}`)
      load()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to resend invitation')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !me) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {loadError}
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      </div>
    )
  }

  if (me?.role !== 'owner') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {me?.role
              ? `You are on ${me.accountName || 'this'} team as ${me.role === 'admin' ? 'an admin' : 'a staff member'}. Only the account owner can add or remove team members.`
              : 'Only a promoter account owner can manage a team.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="h-7 w-7 text-purple-600" />
          Team
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite up to {maxTeamSize} teammates to help run your events. Only you can add or remove people.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-purple-600" />
          Invite a teammate
          <span className="ml-auto text-xs font-normal text-gray-500">{used} of {maxTeamSize} used</span>
        </h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@email.com"
              required
              disabled={full}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'staff')}
              disabled={full}
              aria-label="Role"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting || full || !inviteEmail.trim()}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
          <p className="text-xs text-gray-500">{ROLE_HELP[inviteRole]}</p>
          {full && (
            <p className="text-xs text-amber-700">
              Your team is full. Remove someone or cancel a pending invitation to invite another person.
            </p>
          )}
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Team members <span className="text-gray-400 font-normal text-sm">({members.length})</span>
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No teammates yet. Invite someone above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map(member => {
              const fullName = `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim()
              return (
                <li key={member.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                      {member.user?.first_name?.[0] || '?'}{member.user?.last_name?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fullName || member.user?.email}</p>
                      <p className="text-xs text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded capitalize">
                      {member.role}
                    </span>
                    <button
                      onClick={() => handleRemove(member)}
                      disabled={busyId === member.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Remove team member"
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

      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Pending invitations <span className="text-gray-400 font-normal text-sm">({invitations.length})</span>
            </h2>
          </div>
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
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded capitalize">
                    {invite.role}
                  </span>
                  <button
                    onClick={() => handleResend(invite)}
                    disabled={busyId === invite.id}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    title="Resend invitation"
                  >
                    <RefreshCw className={`h-4 w-4 ${busyId === invite.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleCancel(invite)}
                    disabled={busyId === invite.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
