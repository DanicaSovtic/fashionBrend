import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './UsersPage.css'

const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

const UsersPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    user,
    profile,
    loading,
    roleOptions,
    registerUser,
    fetchUsers,
    updateUserProfile,
    deleteUser
  } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('krajnji_korisnik')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [viewMode, setViewMode] = useState('create')
  const [users, setUsers] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('krajnji_korisnik')

  const isSuperAdmin = profile?.role === 'superadmin'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()
    const finalPassword = password.trim() || generatePassword()

    if (!trimmedName || !trimmedEmail || !role) {
      setError('Popuni ime, email i rolu.')
      return
    }
    try {
      await registerUser(trimmedEmail, finalPassword, trimmedName, role)
      setInfo('Korisnik je kreiran. Poslat je email sa kredencijalima i uputstvom za resetovanje sifre.')
      setFullName('')
      setEmail('')
      setPassword('')
      setRole('krajnji_korisnik')
    } catch (err) {
      setError(err.message)
    }
  }

  const roleLabelMap = useMemo(() => {
    const map = new Map(roleOptions.map((option) => [option.value, option.label]))
    map.set('superadmin', 'Superadmin')
    return map
  }, [roleOptions])

  const loadUsers = async () => {
    try {
      setListLoading(true)
      const result = await fetchUsers()
      setUsers(result.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    const view = searchParams.get('view')
    if (view === 'list' || view === 'create') {
      setViewMode(view)
    }
  }, [searchParams])

  useEffect(() => {
    if (viewMode === 'list') {
      loadUsers()
    }
  }, [viewMode])

  const startEdit = (userItem) => {
    setEditingId(userItem.id)
    setEditName(userItem.profile?.full_name || '')
    setEditRole(userItem.profile?.role || 'krajnji_korisnik')
    setError('')
    setInfo('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditRole('krajnji_korisnik')
  }

  const saveEdit = async (userItem) => {
    try {
      setError('')
      setInfo('')
      await updateUserProfile(userItem.id, {
        fullName: editName.trim(),
        role: editRole
      })
      setInfo('Izmene su sačuvane.')
      setEditingId(null)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (userItem) => {
    if (!window.confirm(`Da li sigurno brisete korisnika ${userItem.email}?`)) {
      return
    }
    try {
      setError('')
      setInfo('')
      await deleteUser(userItem.id)
      setInfo('Korisnik je obrisan.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="users-page">
        <Navbar />
        <div className="users-content">
          <div className="users-card">Učitavanje...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (!isSuperAdmin) {
    return (
      <div className="users-page">
        <Navbar />
        <div className="users-content">
          <div className="users-card">Nemate pristup ovoj strani.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="users-page">
      <Navbar />
      <div className="users-content">
        <div className="users-card">
          <h2>{viewMode === 'list' ? 'Pregled korisnika' : 'Kreiraj korisnika'}</h2>

          {viewMode === 'create' && (
            <form onSubmit={handleSubmit} className="users-form">
              <label>
                Ime i prezime
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Privremena lozinka (opciono)
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ostavi prazno za auto-generisanje"
                />
              </label>
              <label>
                Rola
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="users-actions">
                <button type="button" onClick={() => setPassword(generatePassword())}>
                  Generiši lozinku
                </button>
                <button type="submit">Kreiraj korisnika</button>
              </div>
            </form>
          )}

          {viewMode === 'list' && (
            <div className="users-list">
              {listLoading ? (
                <p>Učitavanje korisnika...</p>
              ) : users.length === 0 ? (
                <p>Nema korisnika za prikaz.</p>
              ) : (
                <div className="users-table">
                  <div className="users-row users-row--head">
                    <span>Ime</span>
                    <span>Email</span>
                    <span>Uloga</span>
                    <span>Akcije</span>
                  </div>
                  {users.map((userItem) => {
                    const isEditing = editingId === userItem.id
                    const roleLabel = roleLabelMap.get(userItem.profile?.role) || '-'
                    return (
                      <div key={userItem.id} className="users-row">
                        <span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                            />
                          ) : (
                            userItem.profile?.full_name || '-'
                          )}
                        </span>
                        <span>{userItem.email || '-'}</span>
                        <span>
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(event) => setEditRole(event.target.value)}
                            >
                              <option value="superadmin">Superadmin</option>
                              {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            roleLabel
                          )}
                        </span>
                        <span className="users-actions-inline">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => saveEdit(userItem)}>
                                Sačuvaj
                              </button>
                              <button type="button" onClick={cancelEdit}>
                                Otkaži
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(userItem)}>
                                Izmeni
                              </button>
                              <button type="button" onClick={() => handleDelete(userItem)}>
                                Obriši
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p className="users-error">{error}</p>}
          {info && <p className="users-info">{info}</p>}

        </div>
      </div>
    </div>
  )
}

export default UsersPage
