import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import './Blog.css'

const BlogDetail = () => {
  const { slugOrId } = useParams()
  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true)
        setError('')

        const response = await fetch(`/api/blog/posts/${slugOrId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Blog post nije pronađen.')
          }
          throw new Error('Greška prilikom učitavanja blog posta.')
        }

        const data = await response.json()
        setPost(data)
      } catch (err) {
        setError(err.message || 'Došlo je do greške prilikom učitavanja blog posta.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [slugOrId])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Render HTML content (bezbedno)
  const renderContent = (htmlContent) => {
    return { __html: htmlContent }
  }

  return (
    <div className="blog-detail">
      <Navbar activePath="/blog" />

      <div className="blog-detail-container">
        {isLoading && (
          <div className="blog-loading">
            <p>Učitavanje blog posta...</p>
          </div>
        )}

        {error && (
          <div className="blog-error">
            <p>{error}</p>
            <Link to="/blog" className="blog-detail-back">
              ← Nazad na blog
            </Link>
          </div>
        )}

        {!isLoading && !error && post && (
          <>
            <div className="blog-detail-header">
              <Link to="/blog" className="blog-detail-back">
                ← Nazad na blog
              </Link>

              <div className="blog-detail-meta">
                {post.categories && post.categories.length > 0 && (
                  <div className="blog-detail-categories">
                    {post.categories.map(cat => (
                      <span key={cat.id} className="blog-detail-category">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
                {post.published_at && (
                  <time dateTime={post.published_at}>
                    {formatDate(post.published_at)}
                  </time>
                )}
                {post.author && (
                  <span>Autor: {post.author}</span>
                )}
              </div>

              <h1 className="blog-detail-title">{post.title}</h1>

              {post.featured_image_url && (
                <img
                  src={post.featured_image_url}
                  alt={post.title}
                  className="blog-detail-featured-image"
                />
              )}
            </div>

            <div className="blog-detail-content">
              {post.excerpt && (
                <p style={{ fontSize: '1.2rem', fontWeight: 500, color: '#666', marginBottom: '2rem' }}>
                  {post.excerpt}
                </p>
              )}
              <div dangerouslySetInnerHTML={renderContent(post.content)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BlogDetail
