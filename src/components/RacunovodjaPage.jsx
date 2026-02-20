import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import './DesignerCollectionsPage.css'

const RacunovodjaPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: ''
  })
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalOrders: 0,
    pendingPayments: 0
  })
  const [chartData, setChartData] = useState([])
  const [expenseDetails, setExpenseDetails] = useState([])
  const [activeChartTab, setActiveChartTab] = useState('revenue-expenses') // 'revenue-expenses', 'profit', 'combined'

  useEffect(() => {
    if (user && profile?.role === 'racunovodja') {
      fetchTransactions()
    }
  }, [user, profile, filters])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = localStorage.getItem('auth_access_token')
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.paymentMethod) params.append('payment_method', filters.paymentMethod)
      if (filters.dateFrom) params.append('date_from', filters.dateFrom)
      if (filters.dateTo) params.append('date_to', filters.dateTo)

      const res = await fetch(`/api/accountant/transactions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Greška pri učitavanju transakcija')
      }

      const data = await res.json()
      console.log('Accountant data received:', { 
        transactionsCount: data.transactions?.length, 
        summary: data.summary,
        chartDataCount: data.chartData?.length,
        chartData: data.chartData 
      })
      setTransactions(data.transactions || [])
      setSummary(data.summary || {
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        totalOrders: 0,
        pendingPayments: 0
      })
      setChartData(data.chartData || [])
      setExpenseDetails(data.expenseDetails || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError(error.message || 'Greška pri učitavanju transakcija')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    if (!amount) return '0,00 RSD'
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusLabel = (status) => {
    const labels = {
      'ready_for_shipping': 'Spremno za slanje',
      'in_transit': 'U transportu',
      'delivered': 'Isporučeno',
      'pending_blockchain': 'Čeka blockchain potvrdu',
      'return_requested': 'Povrat - zahtev',
      'return_approved': 'Povrat - odobren',
      'return_in_transit': 'Povrat - u transportu',
      'return_received': 'Povrat - primljeno',
      'failed_delivery': 'Neuspešna dostava'
    }
    return labels[status] || status || '-'
  }

  const getStatusColor = (status) => {
    const colors = {
      'ready_for_shipping': '#3b82f6',
      'in_transit': '#f59e0b',
      'delivered': '#10b981',
      'pending_blockchain': '#8b5cf6',
      'return_requested': '#ef4444',
      'return_approved': '#f59e0b',
      'return_in_transit': '#f59e0b',
      'return_received': '#6b7280',
      'failed_delivery': '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'card': 'Kartica',
      'cash': 'Gotovina',
      'metamask': 'MetaMask (Blockchain)',
      'bank_transfer': 'Bankovni transfer'
    }
    return labels[method] || method || '-'
  }

  if (loading || isLoading) {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Učitavanje...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate('/auth')
    return null
  }

  if (profile?.role !== 'racunovodja') {
    return (
      <div className="designer-page">
        <Navbar />
        <div className="designer-content">
          <div className="designer-card">Nemate pristup ovoj strani. Potrebna uloga: Računovođa.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="designer-page">
      <Navbar />
      <div className="designer-content">
        {/* Header */}
        <div className="designer-card designer-card--hero">
          <h2>Pregled transakcija</h2>
          <p className="designer-subtitle">
            Pregled svih transakcija i finansijskih podataka sistema
          </p>
        </div>

        {/* Summary Cards */}
        <div className="designer-card">
          <div className="designer-metrics">
            <div className="designer-metric">
              <div className="designer-metric-label">Ukupan prihod</div>
              <div className="designer-metric-value" style={{ color: '#10b981', fontSize: '1.5rem' }}>
                {formatCurrency(summary.totalRevenue)}
              </div>
            </div>
            <div className="designer-metric">
              <div className="designer-metric-label">Ukupan rashod</div>
              <div className="designer-metric-value" style={{ color: '#ef4444', fontSize: '1.5rem' }}>
                {formatCurrency(summary.totalExpenses)}
              </div>
            </div>
            <div className="designer-metric">
              <div className="designer-metric-label">Dobit</div>
              <div className="designer-metric-value" style={{ 
                color: summary.totalProfit >= 0 ? '#10b981' : '#ef4444', 
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                {formatCurrency(summary.totalProfit)}
              </div>
            </div>
            <div className="designer-metric">
              <div className="designer-metric-label">Ukupno porudžbina</div>
              <div className="designer-metric-value">
                {summary.totalOrders}
              </div>
            </div>
            <div className="designer-metric">
              <div className="designer-metric-label">Na čekanju</div>
              <div className="designer-metric-value" style={{ color: '#f59e0b' }}>
                {summary.pendingPayments}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section with Tabs */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Finansijski grafikoni</h3>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveChartTab('revenue-expenses')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeChartTab === 'revenue-expenses' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeChartTab === 'revenue-expenses' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeChartTab === 'revenue-expenses' ? '600' : '400'
              }}
            >
              Prihod vs Rashod
            </button>
            <button
              onClick={() => setActiveChartTab('profit')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeChartTab === 'profit' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeChartTab === 'profit' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeChartTab === 'profit' ? '600' : '400'
              }}
            >
              Dobit
            </button>
            <button
              onClick={() => setActiveChartTab('combined')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeChartTab === 'combined' ? '2px solid var(--color-olive)' : '2px solid transparent',
                color: activeChartTab === 'combined' ? 'var(--color-olive-dark)' : '#666',
                fontWeight: activeChartTab === 'combined' ? '600' : '400'
              }}
            >
              Kombinovani pregled
            </button>
          </div>

          {/* Chart Content */}
          {chartData.length > 0 ? (
            <>
              {/* Revenue vs Expenses Tab */}
              {activeChartTab === 'revenue-expenses' && (
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthLabel" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ color: '#333' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Prihod"
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Rashod"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Profit Tab */}
              {activeChartTab === 'profit' && (
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthLabel" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ color: '#333' }}
                      />
                      <Legend />
                      <Bar dataKey="profit" name="Dobit">
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.profit >= 0 ? '#10b981' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Combined Tab */}
              {activeChartTab === 'combined' && (
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthLabel" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ color: '#333' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Prihod" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Rashod" />
                      <Bar dataKey="profit" fill="#3b82f6" name="Dobit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              Nema podataka za prikaz grafikona. Grafikoni će se pojaviti kada budu dostupni podaci o transakcijama i rashodima.
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Filteri</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Svi statusi</option>
                <option value="ready_for_shipping">Spremno za slanje</option>
                <option value="in_transit">U transportu</option>
                <option value="delivered">Isporučeno</option>
                <option value="pending_blockchain">Čeka blockchain potvrdu</option>
                <option value="return_requested">Povrat - zahtev</option>
                <option value="failed_delivery">Neuspešna dostava</option>
              </select>
            </div>
            <div style={{ minWidth: '180px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Način plaćanja
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Svi načini</option>
                <option value="card">Kartica</option>
                <option value="cash">Gotovina</option>
                <option value="metamask">MetaMask</option>
                <option value="bank_transfer">Bankovni transfer</option>
              </select>
            </div>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Od datuma
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '0.9rem' }}>
                Do datuma
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                onClick={() => setFilters({ status: '', paymentMethod: '', dateFrom: '', dateTo: '' })}
                className="designer-secondary-button"
                style={{ padding: '8px 16px' }}
              >
                Resetuj filtere
              </button>
            </div>
          </div>
        </div>

        {/* Expense Details Section */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Detalji rashoda</h3>
          {expenseDetails.length === 0 ? (
            <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              Nema podataka o rashodima za prikaz
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <strong>Ukupan rashod: {formatCurrency(summary.totalExpenses)}</strong>
                <span className="designer-muted" style={{ fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>
                  {expenseDetails.length} stavki
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Datum</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Materijal</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Boja</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Količina (kg)</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Cena po kg</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Ukupno</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Dobavljač</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseDetails.map((expense) => (
                      <tr key={expense.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>
                          {formatDate(expense.created_at)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <strong>{expense.material}</strong>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {expense.color}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {expense.quantity_kg.toFixed(2)} kg
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {expense.is_estimated ? (
                            <span style={{ color: '#f59e0b' }}>
                              ~{formatCurrency(500)} <span style={{ fontSize: '0.75rem' }}>(procena)</span>
                            </span>
                          ) : (
                            formatCurrency(expense.price_per_kg)
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(expense.total_cost)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {expense.supplier_name}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {expense.model_name ? (
                            <div>
                              <strong>{expense.model_name}</strong>
                              {expense.model_sku && (
                                <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                                  {expense.model_sku}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="designer-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #eee', backgroundColor: '#f9fafb' }}>
                      <td colSpan="5" style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        Ukupan rashod:
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>
                        {formatCurrency(summary.totalExpenses)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Transactions Table */}
        <div className="designer-card">
          <h3 style={{ marginBottom: '20px' }}>Transakcije</h3>
          {error && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fee2e2', 
              color: '#991b1b', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              {error}
            </div>
          )}
          {transactions.length === 0 ? (
            <div className="designer-muted" style={{ padding: '2rem', textAlign: 'center' }}>
              {isLoading ? 'Učitavanje...' : 'Nema transakcija za prikaz'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ID porudžbine</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Kupac</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Datum</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Iznos</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Način plaćanja</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Detalji</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {transaction.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <strong>{transaction.recipient_name || '-'}</strong>
                          {transaction.recipient_email && (
                            <span className="designer-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                              {transaction.recipient_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {formatDate(transaction.created_at)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(transaction.total_price)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {getPaymentMethodLabel(transaction.payment_method)}
                        {transaction.tx_hash && (
                          <span className="designer-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                            TX: {transaction.tx_hash.substring(0, 10)}...
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            backgroundColor: getStatusColor(transaction.status) + '20',
                            color: getStatusColor(transaction.status)
                          }}
                        >
                          {getStatusLabel(transaction.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => {
                            const details = `
Porudžbina ID: ${transaction.id}
Kupac: ${transaction.recipient_name || '-'}
Email: ${transaction.recipient_email || '-'}
Telefon: ${transaction.recipient_phone || '-'}
Adresa: ${transaction.recipient_street || '-'}, ${transaction.recipient_city || '-'}
Iznos: ${formatCurrency(transaction.total_price)}
Način plaćanja: ${getPaymentMethodLabel(transaction.payment_method)}
Status: ${getStatusLabel(transaction.status)}
Datum: ${formatDate(transaction.created_at)}
${transaction.tx_hash ? `Blockchain TX: ${transaction.tx_hash}` : ''}
${transaction.order_items?.length ? `\n\nProizvodi:\n${transaction.order_items.map(item => `- ${item.product_name || 'N/A'} x${item.quantity}`).join('\n')}` : ''}
                            `
                            alert(details)
                          }}
                          className="designer-secondary-button"
                          style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                        >
                          Detalji
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RacunovodjaPage
