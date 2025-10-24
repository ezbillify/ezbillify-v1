import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import customerService from '../services/customerService'

const TestCustomers = () => {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (company?.id) {
      loadCustomers()
    }
  }, [company?.id])

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching customers for company:', company.id)
      const result = await customerService.getCustomers(company.id)
      console.log('Customer service result:', result)
      
      if (result.success) {
        setCustomers(result.data.customers)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading customers...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Customer Test</h1>
      <p>Company ID: {company?.id}</p>
      <p>Customers found: {customers.length}</p>
      
      {customers.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Customers:</h2>
          <ul>
            {customers.map(customer => (
              <li key={customer.id} className="mb-2 p-2 border rounded">
                <strong>{customer.name}</strong> ({customer.customer_code})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TestCustomers