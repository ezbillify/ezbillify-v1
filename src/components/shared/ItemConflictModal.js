// src/components/shared/ItemConflictModal.js
import { useRouter } from 'next/router'

/**
 * ItemConflictModal - Shows barcode conflict with pricing
 * Calculates tax rate from selling_price and selling_price_with_tax
 */
const ItemConflictModal = ({ isOpen, onClose, conflictData }) => {
  const router = useRouter()

  if (!isOpen || !conflictData) return null

  const { barcode, existingItem } = conflictData

  // Calculate tax rate from selling_price and selling_price_with_tax
  const calculateTaxRate = () => {
    const sp = parseFloat(existingItem.selling_price || 0)
    const spwt = parseFloat(existingItem.selling_price_with_tax || 0)
    
    // If we have both prices and they're different, calculate tax rate
    if (sp > 0 && spwt > sp) {
      const tax = spwt - sp
      const rate = (tax / sp) * 100
      return parseFloat(rate.toFixed(2))
    }
    
    // Fall back to tax_rate from database
    if (existingItem.tax_rate && parseFloat(existingItem.tax_rate) > 0) {
      return parseFloat(existingItem.tax_rate)
    }
    
    return 0
  }

  const mrp = parseFloat(existingItem.mrp || 0)
  const sellingPrice = parseFloat(existingItem.selling_price || 0)
  const sellingPriceWithTax = parseFloat(existingItem.selling_price_with_tax || 0)
  const taxRate = calculateTaxRate()
  const taxAmount = sellingPriceWithTax - sellingPrice

  const handleViewItem = () => {
    if (existingItem.id) {
      router.push(`/items/edit/${existingItem.id}`)
    }
    onClose()
  }

  return (
    <>
      {/* Subtle backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[9999] transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Ultra wide, compact height */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-xl max-w-5xl w-full transform transition-all overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header - Red, minimal */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="text-lg font-bold">Barcode Conflict</h2>
                <p className="text-red-100 text-xs">This barcode is already in use</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body - Compact, minimal */}
          <div className="p-6">
            {/* Three Column Layout */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              
              {/* Barcode */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                  Conflict
                </p>
                <p className="text-3xl font-bold font-mono text-red-600">
                  {barcode}
                </p>
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Duplicate
                </p>
              </div>

              {/* Assigned Item - Middle */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  Assigned To
                </p>
                <p className="text-lg font-bold text-blue-900 truncate">
                  {existingItem.item_name || existingItem.name}
                </p>
                <p className="text-xs text-blue-700 mt-2 font-mono">
                  {existingItem.item_code || existingItem.code}
                </p>
              </div>

              {/* Status - Right */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col justify-center">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">
                  Status
                </p>
                <p className="font-bold text-orange-900">Cannot Create</p>
                <p className="text-xs text-orange-700 mt-1">
                  Barcode already assigned
                </p>
              </div>
            </div>

            {/* Item Details - Single Row with MRP, Selling Price, Tax */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-6 gap-4 text-sm">
                {/* Item Name */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Item Name</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {existingItem.item_name || existingItem.name}
                  </p>
                </div>

                {/* MRP */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">MRP</p>
                  <p className="font-bold text-gray-900">
                    {mrp > 0 ? `₹${mrp.toFixed(2)}` : 'N/A'}
                  </p>
                </div>

                {/* Selling Price (without tax) */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Price</p>
                  <p className="font-bold text-green-600">
                    {sellingPrice > 0 ? `₹${sellingPrice.toFixed(2)}` : 'N/A'}
                  </p>
                </div>

                {/* Tax Rate */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Tax</p>
                  <p className="font-bold text-blue-600">
                    {taxRate > 0 ? `${taxRate.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>

                {/* Selling Price with Tax */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Inc. Tax</p>
                  <p className="font-bold text-purple-600">
                    {sellingPriceWithTax > 0 ? `₹${sellingPriceWithTax.toFixed(2)}` : 'N/A'}
                  </p>
                </div>

                {/* Barcode */}
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Barcode</p>
                  <p className="font-mono font-bold text-red-600 truncate">{barcode}</p>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown (Optional) */}
            {sellingPrice > 0 && taxRate > 0 && taxAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Base Price</p>
                    <p className="text-sm font-bold text-gray-900">₹{sellingPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">Tax Amount ({taxRate.toFixed(1)}%)</p>
                    <p className="text-sm font-bold text-blue-600">₹{taxAmount.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600 font-semibold">Total (Inc. Tax)</p>
                    <p className="text-lg font-bold text-purple-600">₹{sellingPriceWithTax.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning - Compact */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-bold text-amber-900 mb-1.5">⚠️ Barcode must be unique</p>
              <p className="text-xs text-amber-800">
                Use a different barcode or remove this one from the existing item first.
              </p>
            </div>
          </div>

          {/* Footer - Minimal */}
          <div className="bg-gray-50 px-8 py-3 flex gap-2 justify-end border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleViewItem}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
            >
              View Item
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ItemConflictModal