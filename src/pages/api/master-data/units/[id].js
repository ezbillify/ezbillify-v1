import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('units')
          .select(`
            *,
            base_unit:base_unit_id(unit_name, unit_symbol)
          `)
          .eq('id', id)
          .or(`company_id.eq.${company.id},company_id.is.null`)
          .single()

        if (error) throw error

        res.status(200).json({
          success: true,
          data
        })
      } catch (error) {
        console.error('Error fetching unit:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'PUT':
      try {
        // Only allow updates for company-owned units (not system units)
        const { data: existingUnit } = await supabase
          .from('units')
          .select('company_id')
          .eq('id', id)
          .single()

        if (!existingUnit || existingUnit.company_id !== company.id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot modify system units or units from other companies'
          })
        }

        const unitData = {
          ...req.body,
          conversion_factor: parseFloat(req.body.conversion_factor) || 1,
          base_unit_id: req.body.base_unit_id || null
        }

        const { data, error } = await supabase
          .from('units')
          .update(unitData)
          .eq('id', id)
          .eq('company_id', company.id)
          .select()

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error updating unit:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'DELETE':
      try {
        // Check if unit is system unit
        const { data: existingUnit } = await supabase
          .from('units')
          .select('company_id')
          .eq('id', id)
          .single()

        if (!existingUnit || existingUnit.company_id === null) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete system units'
          })
        }

        if (existingUnit.company_id !== company.id) {
          return res.status(403).json({
            success: false,
            error: 'Cannot delete units from other companies'
          })
        }

        // Check if unit is being used
        const { data: itemUsage } = await supabase
          .from('items')
          .select('id')
          .or(`primary_unit_id.eq.${id},secondary_unit_id.eq.${id}`)
          .limit(1)

        if (itemUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete unit that is assigned to items'
          })
        }

        // Check if unit is being used as base unit for other units
        const { data: baseUsage } = await supabase
          .from('units')
          .select('id')
          .eq('base_unit_id', id)
          .limit(1)

        if (baseUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete unit that is used as base unit for other units'
          })
        }

        const { error } = await supabase
          .from('units')
          .delete()
          .eq('id', id)
          .eq('company_id', company.id)

        if (error) throw error

        res.status(200).json({
          success: true,
          message: 'Unit deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting unit:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuth(handler)