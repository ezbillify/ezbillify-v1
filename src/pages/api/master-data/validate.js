import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }

  try {
    const { type, value, excludeId, field } = req.body

    let isValid = true
    let message = null

    switch (type) {
      case 'account_code':
        let accountQuery = supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', company.id)
          .eq('account_code', value)

        if (excludeId) {
          accountQuery = accountQuery.neq('id', excludeId)
        }

        const { data: accountData } = await accountQuery
        isValid = accountData?.length === 0
        message = !isValid ? 'Account code already exists' : null
        break

      case 'tax_rate_name':
        let taxQuery = supabase
          .from('tax_rates')
          .select('id')
          .eq('company_id', company.id)
          .eq('tax_name', value)

        if (excludeId) {
          taxQuery = taxQuery.neq('id', excludeId)
        }

        const { data: taxData } = await taxQuery
        isValid = taxData?.length === 0
        message = !isValid ? 'Tax rate name already exists' : null
        break

      case 'unit_symbol':
        let unitQuery = supabase
          .from('units')
          .select('id')
          .eq('company_id', company.id)
          .eq('unit_symbol', value)

        if (excludeId) {
          unitQuery = unitQuery.neq('id', excludeId)
        }

        const { data: unitData } = await unitQuery
        isValid = unitData?.length === 0
        message = !isValid ? 'Unit symbol already exists' : null
        break

      case 'payment_term_name':
        let termQuery = supabase
          .from('payment_terms')
          .select('id')
          .eq('company_id', company.id)
          .eq('term_name', value)

        if (excludeId) {
          termQuery = termQuery.neq('id', excludeId)
        }

        const { data: termData } = await termQuery
        isValid = termData?.length === 0
        message = !isValid ? 'Payment term name already exists' : null
        break

      case 'ifsc_code':
        // Validate IFSC format
        const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/
        isValid = ifscPattern.test(value)
        message = !isValid ? 'Invalid IFSC code format' : null
        
        // If format is valid, try to fetch bank details
        if (isValid) {
          try {
            const response = await fetch(`https://ifsc.razorpay.com/${value}`)
            if (response.ok) {
              const bankData = await response.json()
              return res.status(200).json({
                success: true,
                isValid: true,
                bankDetails: bankData
              })
            } else {
              message = 'IFSC code not found'
              isValid = false
            }
          } catch (error) {
            message = 'Unable to validate IFSC code'
            isValid = false
          }
        }
        break

      case 'currency_code':
        let currencyQuery = supabase
          .from('currencies')
          .select('id')
          .eq('company_id', company.id)
          .eq('currency_code', value)

        if (excludeId) {
          currencyQuery = currencyQuery.neq('id', excludeId)
        }

        const { data: currencyData } = await currencyQuery
        isValid = currencyData?.length === 0
        message = !isValid ? 'Currency code already exists' : null
        break

      case 'gst_calculation':
        const { cgst, sgst, igst, total } = req.body
        const cgstRate = parseFloat(cgst) || 0
        const sgstRate = parseFloat(sgst) || 0
        const igstRate = parseFloat(igst) || 0
        const totalRate = parseFloat(total) || 0

        const cgstSgstTotal = cgstRate + sgstRate
        
        if (Math.abs(cgstSgstTotal - totalRate) > 0.01) {
          isValid = false
          message = 'CGST + SGST should equal total tax rate'
        } else if (Math.abs(igstRate - totalRate) > 0.01) {
          isValid = false
          message = 'IGST should equal total tax rate'
        }
        break

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid validation type'
        })
    }

    res.status(200).json({
      success: true,
      isValid,
      message
    })

  } catch (error) {
    console.error('Error validating data:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export default withAuth(handler)