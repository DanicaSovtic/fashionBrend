import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import './Blog.css'

const Blog = () => {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Učitaj kategorije
        const categoriesResponse = await fetch('/api/blog/categories')
        console.log('[Blog] Categories response status:', categoriesResponse.status)
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        } else {
          const errorData = await categoriesResponse.json().catch(() => ({}))
          console.error('[Blog] Categories error:', errorData)
        }

        // Učitaj blog postove
        const postsResponse = await fetch('/api/blog/posts')
        console.log('[Blog] Posts response status:', postsResponse.status)
        if (!postsResponse.ok) {
          const errorData = await postsResponse.json().catch(() => ({}))
          console.error('[Blog] Posts error:', errorData)
          throw new Error(errorData.error || 'Greška prilikom učitavanja blog postova.')
        }
        const postsData = await postsResponse.json()
        setPosts(postsData)
      } catch (err) {
        setError(err.message || 'Došlo je do greške prilikom učitavanja blog postova.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => 
        post.categories?.some(cat => cat.slug === selectedCategory)
      )

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="blog">
      <Navbar activePath="/blog" />

      <div className="blog-container">
        <header className="blog-header">
          <h1 className="blog-title">Blog</h1>
          <p className="blog-subtitle">
            Pratite najnovije vesti, trendove i događaje iz sveta mode
          </p>
        </header>

        {/* Filter kategorija */}
        {categories.length > 0 && (
          <div className="blog-filters">
            <button
              className={`blog-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Sve
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`blog-filter-btn ${selectedCategory === category.slug ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="blog-loading">
            <p>Učitavanje blog postova...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="blog-error">
            <p>{error}</p>
          </div>
        )}

        {/* Blog postovi */}
        {!isLoading && !error && (
          <>
            {filteredPosts.length === 0 ? (
              <div className="blog-empty">
                <p>Nema blog postova za prikaz.</p>
              </div>
            ) : (
              <div className="blog-posts-grid">
                {filteredPosts.map(post => (
                  <article key={post.id} className="blog-post-card">
                    <Link to={`/blog/${post.slug}`} className="blog-post-link">
                      {post.featured_image_url && (
                        <div className="blog-post-image">
                          <img src={post.featured_image_url} alt={post.title} />
                        </div>
                      )}
                      <div className="blog-post-content">
                        <div className="blog-post-meta">
                          {post.categories && post.categories.length > 0 && (
                            <div className="blog-post-categories">
                              {post.categories.map(cat => (
                                <span key={cat.id} className="blog-post-category">
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {post.published_at && (
                            <time className="blog-post-date" dateTime={post.published_at}>
                              {formatDate(post.published_at)}
                            </time>
                          )}
                        </div>
                        <h2 className="blog-post-title">{post.title}</h2>
                        {post.excerpt && (
                          <p className="blog-post-excerpt">{post.excerpt}</p>
                        )}
                        <span className="blog-post-read-more">Pročitaj više →</span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Blog
