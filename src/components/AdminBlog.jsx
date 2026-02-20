import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import './AdminBlog.css'

const AdminBlog = () => {
  const { profile } = useAuth()
  const AUTH_STORAGE_KEY = 'auth_access_token'
  const getToken = () => localStorage.getItem(AUTH_STORAGE_KEY)
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list', 'create', 'edit'
  const [selectedPost, setSelectedPost] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'draft', 'published', 'archived'

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    published_at: '',
    status: 'draft',
    category_ids: []
  })

  useEffect(() => {
    if (profile?.role !== 'superadmin' && profile?.role !== 'marketing_asistent') {
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError('')

        const token = getToken()
        if (!token) {
          throw new Error('Niste autentifikovani')
        }

        // Učitaj kategorije
        const categoriesResponse = await fetch('/api/blog/categories')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }

        // Učitaj blog postove
        await fetchPosts()
      } catch (err) {
        setError(err.message || 'Došlo je do greške.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [profile, statusFilter])

  const fetchPosts = async () => {
    const token = getToken()
    if (!token) {
      throw new Error('Niste autentifikovani')
    }
    
    const url = statusFilter === 'all'
      ? '/api/blog/admin/posts'
      : `/api/blog/admin/posts?status=${statusFilter}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Greška prilikom učitavanja blog postova.')
    }

    const data = await response.json()
    setPosts(data)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')

      const token = getToken()
      if (!token) {
        throw new Error('Niste autentifikovani')
      }

      const url = viewMode === 'create'
        ? '/api/blog/admin/posts'
        : `/api/blog/admin/posts/${selectedPost.id}`

      const method = viewMode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Greška prilikom čuvanja blog posta.')
      }

      await fetchPosts()
      setViewMode('list')
      resetForm()
    } catch (err) {
      setError(err.message || 'Došlo je do greške.')
    }
  }

  const handleEdit = (post) => {
    setSelectedPost(post)
    setFormData({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image_url: post.featured_image_url || '',
      published_at: post.published_at ? post.published_at.split('T')[0] : '',
      status: post.status || 'draft',
      category_ids: post.categories?.map(cat => cat.id) || []
    })
    setViewMode('edit')
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovaj blog post?')) {
      return
    }

    try {
      setError('')

      const token = getToken()
      if (!token) {
        throw new Error('Niste autentifikovani')
      }

      const response = await fetch(`/api/blog/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Greška prilikom brisanja blog posta.')
      }

      await fetchPosts()
    } catch (err) {
      setError(err.message || 'Došlo je do greške.')
    }
  }

  const handleStatusChange = async (postId, newStatus) => {
    try {
      setError('')

      const token = getToken()
      if (!token) {
        throw new Error('Niste autentifikovani')
      }

      const response = await fetch(`/api/blog/admin/posts/${postId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Greška prilikom promene statusa.')
      }

      await fetchPosts()
    } catch (err) {
      setError(err.message || 'Došlo je do greške.')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featured_image_url: '',
      published_at: '',
      status: 'draft',
      category_ids: []
    })
    setSelectedPost(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nije objavljen'
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (profile?.role !== 'superadmin' && profile?.role !== 'marketing_asistent') {
    return (
      <div className="admin-blog">
        <Navbar />
        <div className="admin-blog-container">
          <div className="admin-blog-error">
            <p>Nemate pristup ovoj stranici.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-blog">
      <Navbar />

      <div className="admin-blog-container">
        <div className="admin-blog-header">
          <h1>Upravljanje Blogom</h1>
          {viewMode === 'list' && (
            <button
              className="admin-blog-btn admin-blog-btn-primary"
              onClick={() => {
                resetForm()
                setViewMode('create')
              }}
            >
              + Novi Blog Post
            </button>
          )}
        </div>

        {error && (
          <div className="admin-blog-error">
            <p>{error}</p>
          </div>
        )}

        {viewMode === 'list' && (
          <>
            {/* Filteri */}
            <div className="admin-blog-filters">
              <button
                className={`admin-blog-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Svi
              </button>
              <button
                className={`admin-blog-filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </button>
              <button
                className={`admin-blog-filter-btn ${statusFilter === 'published' ? 'active' : ''}`}
                onClick={() => setStatusFilter('published')}
              >
                Objavljeni
              </button>
              <button
                className={`admin-blog-filter-btn ${statusFilter === 'archived' ? 'active' : ''}`}
                onClick={() => setStatusFilter('archived')}
              >
                Arhivirani
              </button>
            </div>

            {/* Lista postova */}
            {isLoading ? (
              <div className="admin-blog-loading">
                <p>Učitavanje...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="admin-blog-empty">
                <p>Nema blog postova.</p>
              </div>
            ) : (
              <div className="admin-blog-posts">
                {posts.map(post => (
                  <div key={post.id} className="admin-blog-post-card">
                    <div className="admin-blog-post-header">
                      <h3>{post.title}</h3>
                      <span className={`admin-blog-post-status admin-blog-post-status-${post.status}`}>
                        {post.status === 'draft' && 'Draft'}
                        {post.status === 'published' && 'Objavljen'}
                        {post.status === 'archived' && 'Arhiviran'}
                      </span>
                    </div>
                    {post.excerpt && (
                      <p className="admin-blog-post-excerpt">{post.excerpt}</p>
                    )}
                    <div className="admin-blog-post-meta">
                      <span>Objavljen: {formatDate(post.published_at)}</span>
                      {post.categories && post.categories.length > 0 && (
                        <span>
                          Kategorije: {post.categories.map(cat => cat.name).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="admin-blog-post-actions">
                      <button
                        className="admin-blog-btn admin-blog-btn-secondary"
                        onClick={() => handleEdit(post)}
                      >
                        Izmeni
                      </button>
                      {post.status === 'draft' && (
                        <button
                          className="admin-blog-btn admin-blog-btn-success"
                          onClick={() => handleStatusChange(post.id, 'published')}
                        >
                          Objavi
                        </button>
                      )}
                      {post.status === 'published' && (
                        <button
                          className="admin-blog-btn admin-blog-btn-warning"
                          onClick={() => handleStatusChange(post.id, 'archived')}
                        >
                          Arhiviraj
                        </button>
                      )}
                      {post.status === 'archived' && (
                        <button
                          className="admin-blog-btn admin-blog-btn-success"
                          onClick={() => handleStatusChange(post.id, 'published')}
                        >
                          Vrati iz arhive
                        </button>
                      )}
                      <button
                        className="admin-blog-btn admin-blog-btn-danger"
                        onClick={() => handleDelete(post.id)}
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <form className="admin-blog-form" onSubmit={handleSubmit}>
            <div className="admin-blog-form-header">
              <h2>{viewMode === 'create' ? 'Kreiraj Novi Blog Post' : 'Izmeni Blog Post'}</h2>
              <button
                type="button"
                className="admin-blog-btn admin-blog-btn-secondary"
                onClick={() => {
                  setViewMode('list')
                  resetForm()
                }}
              >
                Otkaži
              </button>
            </div>

            <div className="admin-blog-form-group">
              <label htmlFor="title">Naslov *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Unesite naslov blog posta"
              />
            </div>

            <div className="admin-blog-form-group">
              <label htmlFor="excerpt">Kratak opis (preview tekst)</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                rows="3"
                placeholder="Kratak opis koji će se prikazati u listi blog postova"
              />
            </div>

            <div className="admin-blog-form-group">
              <label htmlFor="content">Glavni tekst (HTML) *</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows="15"
                placeholder="Unesite glavni tekst blog posta. Možete koristiti HTML tagove za formatiranje."
              />
              <small>Možete koristiti HTML tagove za formatiranje (h2, h3, p, ul, ol, li, strong, em, a, itd.)</small>
            </div>

            <div className="admin-blog-form-group">
              <label htmlFor="featured_image_url">URL naslovne slike</label>
              <input
                type="url"
                id="featured_image_url"
                name="featured_image_url"
                value={formData.featured_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="admin-blog-form-row">
              <div className="admin-blog-form-group">
                <label htmlFor="published_at">Datum objave</label>
                <input
                  type="date"
                  id="published_at"
                  name="published_at"
                  value={formData.published_at}
                  onChange={handleInputChange}
                />
                <small>Ostavite prazno za automatski datum pri objavljivanju</small>
              </div>

              <div className="admin-blog-form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Objavljen</option>
                  <option value="archived">Arhiviran</option>
                </select>
              </div>
            </div>

            <div className="admin-blog-form-group">
              <label>Kategorije</label>
              <div className="admin-blog-categories">
                {categories.map(category => (
                  <label key={category.id} className="admin-blog-category-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.category_ids.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="admin-blog-form-actions">
              <button type="submit" className="admin-blog-btn admin-blog-btn-primary">
                {viewMode === 'create' ? 'Kreiraj' : 'Sačuvaj izmene'}
              </button>
              <button
                type="button"
                className="admin-blog-btn admin-blog-btn-secondary"
                onClick={() => {
                  setViewMode('list')
                  resetForm()
                }}
              >
                Otkaži
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AdminBlog
