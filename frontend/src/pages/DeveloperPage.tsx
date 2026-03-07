import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import { C, injectFonts } from '../theme'
import {
  TrashIcon,
  PlusIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string
  name: string
  key_preview: string
  is_sandbox: boolean
  is_active: boolean
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  status: 'active' | 'expired'
}

interface DeveloperStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  monthly_usage: number
  monthly_limit: number
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  color: C.text,
  borderRadius: 6,
  padding: '10px 14px',
  width: '100%',
  fontSize: 14,
  fontFamily: C.sans,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: C.muted,
  marginBottom: 6,
  fontWeight: 500,
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        const res = await fetch(`${API_BASE_URL}/api/developer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, company }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Registration failed')
        // Auto-login after register (passwordless — email only)
        const loginRes = await fetch(`${API_BASE_URL}/api/auth/developer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const loginData = await loginRes.json()
        if (!loginRes.ok) throw new Error(loginData.message || 'Login failed')
        localStorage.setItem('developer_token', loginData.token)
        onAuth(loginData.token)
      } else {
        const res = await fetch(`${API_BASE_URL}/api/auth/developer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Invalid credentials')
        localStorage.setItem('developer_token', data.token)
        onAuth(data.token)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, letterSpacing: '0.08em', marginBottom: 24 }}>
          idswyft / developer-portal
        </div>
        <h1 style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>
          {mode === 'login' ? 'Manage your API keys' : 'Get your free API key'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div>
                <label style={labelStyle}>Company (optional)</label>
                <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background: C.cyan, color: C.bg, borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontSize: 13 }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ─── Create key modal ─────────────────────────────────────────────────────────

function CreateKeyModal({ onClose, onCreated, token }: {
  onClose: () => void
  onCreated: (key: ApiKey, fullKey: string) => void
  token: string
}) {
  const [name, setName] = useState('')
  const [isSandbox, setIsSandbox] = useState(true)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/developer/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, is_sandbox: isSandbox }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create key')
      onCreated(data.key, data.full_key ?? data.key.key_preview)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, width: '100%', maxWidth: 420 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 24 }}>Create API Key</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Key name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production App" required />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              id="sandbox-toggle"
              checked={isSandbox}
              onChange={e => setIsSandbox(e.target.checked)}
              style={{ accentColor: C.cyan, width: 16, height: 16 }}
            />
            <label htmlFor="sandbox-toggle" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
              Sandbox mode (simulated results)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, background: C.cyan, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating…' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main portal ──────────────────────────────────────────────────────────────

export function DeveloperPage() {
  useEffect(() => { injectFonts() }, [])

  const [token, setToken] = useState<string | null>(localStorage.getItem('developer_token'))
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<DeveloperStats | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newFullKey, setNewFullKey] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchKeys = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/developer/api-keys`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.status === 401) { localStorage.removeItem('developer_token'); setToken(null); return }
      if (res.ok) setApiKeys(await res.json())
    } catch { /* network error — backend offline, show empty state */ }
  }

  const fetchStats = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/developer/stats`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setStats(await res.json())
    } catch { /* network error */ }
  }

  useEffect(() => {
    if (token) {
      fetchKeys(token)
      fetchStats(token)
    }
  }, [token])

  const handleAuth = (t: string) => setToken(t)

  const handleCreated = (key: ApiKey, fullKey: string) => {
    setApiKeys(prev => [...prev, key])
    setNewFullKey(fullKey)
    setShowCreate(false)
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/developer/api-key/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      setApiKeys(prev => prev.filter(k => k.id !== id))
      toast.success('Key deleted')
    } catch {
      toast.error('Failed to delete key')
    } finally {
      setDeleteId(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('developer_token')
    setToken(null)
    setApiKeys([])
    setStats(null)
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Copied to clipboard')
  }

  if (!token) {
    return (
      <div style={{ background: C.bg, fontFamily: C.sans, color: C.text, minHeight: '100vh' }}>
        <AuthGate onAuth={handleAuth} />
      </div>
    )
  }

  const curlSnippet = `curl -X POST https://api.idswyft.app/api/verification/sessions \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"sandbox"}'`

  return (
    <div style={{ background: C.bg, fontFamily: C.sans, color: C.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, letterSpacing: '0.08em', marginBottom: 8 }}>
              idswyft / developer-portal
            </div>
            <h1 style={{ fontFamily: C.mono, fontSize: 24, fontWeight: 600, color: C.text }}>API Keys</h1>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            Sign out
          </button>
        </div>

        {/* New key banner */}
        {newFullKey && (
          <div style={{ background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: 8, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 4 }}>Key created — copy it now, it won't be shown again</div>
              <code style={{ fontFamily: C.mono, fontSize: 13, color: C.text, wordBreak: 'break-all' }}>{newFullKey}</code>
            </div>
            <button
              onClick={() => copyKey(newFullKey)}
              style={{ background: C.green, color: C.bg, border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
            >
              Copy
            </button>
            <button
              onClick={() => setNewFullKey(null)}
              style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Usage strip */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Requests this month', value: stats.monthly_usage.toLocaleString() },
              { label: 'Verifications',        value: stats.successful_requests.toLocaleString() },
              { label: 'Limit remaining',      value: (stats.monthly_limit - stats.monthly_usage).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ fontFamily: C.mono, fontSize: 24, fontWeight: 600, color: C.cyan }}>{value}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* API Keys table */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>API Keys</span>
            <button
              onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.cyan, color: C.bg, border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              <PlusIcon style={{ width: 14, height: 14 }} />
              Create Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Key', 'Type', 'Created', 'Last Used', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', color: C.text, fontSize: 14 }}>{key.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontFamily: C.mono, fontSize: 12, color: C.muted }}>{key.key_preview}</code>
                        <button
                          onClick={() => copyKey(key.key_preview)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 2 }}
                        >
                          <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: key.is_sandbox ? 'rgba(251,191,36,0.1)' : C.greenDim,
                        color: key.is_sandbox ? C.amber : C.green,
                        border: `1px solid ${key.is_sandbox ? C.amber : C.green}33`,
                        borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                      }}>
                        {key.is_sandbox ? 'sandbox' : 'live'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {deleteId === key.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleDelete(key.id)}
                            style={{ background: C.redDim, color: C.red, border: `1px solid ${C.red}33`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(key.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 4 }}
                        >
                          <TrashIcon style={{ width: 15, height: 15 }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick start */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 16 }}>Quick Start</div>
          <pre style={{ background: C.codeBg, borderRadius: 6, padding: '16px 18px', margin: 0, fontFamily: C.mono, fontSize: 12, color: C.code, lineHeight: 1.7, overflowX: 'auto' }}>
            <code>{curlSnippet}</code>
          </pre>
          <div style={{ marginTop: 12 }}>
            <Link to="/docs" style={{ color: C.cyan, fontSize: 13, textDecoration: 'none' }}>
              Full documentation →
            </Link>
          </div>
        </div>

        {/* Webhook */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>Webhook</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
            Receive POST callbacks when verification status changes.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://yourapp.com/webhook"
            />
            <button
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: '10px 18px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
              onClick={() => toast.success('Webhook test sent')}
            >
              Test
            </button>
          </div>
        </div>

      </div>

      {/* Create key modal */}
      {showCreate && token && (
        <CreateKeyModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
