// src/services/veekaartIntegrationService.js
// Service functions to push data to Veekaart

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000'

/**
 * Push all products to Veekaart
 */
export const pushAllProducts = async (companyId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/veekaart/push-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error pushing products:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Push specific products to Veekaart
 */
export const pushProducts = async (companyId, products) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/veekaart/push-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId,
        products
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error pushing products:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Push all inventory to Veekaart
 */
export const pushAllInventory = async (companyId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/veekaart/push-inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error pushing inventory:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Push specific inventory items to Veekaart
 */
export const pushInventory = async (companyId, items) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/veekaart/push-inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId,
        items
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error pushing inventory:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Push pricing to Veekaart
 */
export const pushPricing = async (companyId, products) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/integrations/veekaart/push-pricing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId,
        products
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error pushing pricing:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Regenerate API key
 */
export const regenerateApiKey = async (companyId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/regenerate-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error regenerating API key:', error)
    return {
      success: false,
      error: error.message
    }
  }
}