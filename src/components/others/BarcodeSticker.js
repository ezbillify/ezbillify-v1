// src/components/others/BarcodeSticker.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

const BarcodeSticker = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [items, setItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [stickerOptions, setStickerOptions] = useState({
    size: 'medium',
    format: 'standard',
    includePrice: true,
    includeName: true,
    includeCode: true,
    copies: 1
  })

  // SVG Icons
  const SearchIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )

  const BarcodeIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0-3h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
    </svg>
  )

  const PrintIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  )

  const CheckIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )

  useEffect(() => {
    loadItems()
  }, [company])

  const loadItems = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/items?company_id=${company.id}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setItems(result.data || [])
        }
      }
    } catch (err) {
      console.error('Error loading items:', err)
      error('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => 
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map(item => item.id))
    }
  }

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const generateBarcodes = async () => {
    if (selectedItems.length === 0) {
      error('Please select at least one item')
      return
    }

    setGenerating(true)
    
    try {
      const response = await fetch('/api/barcode/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: company.id,
          item_ids: selectedItems,
          options: stickerOptions
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `barcode-stickers-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        success('Barcode stickers generated successfully')
      } else {
        error('Failed to generate barcode stickers')
      }
    } catch (err) {
      console.error('Error generating barcodes:', err)
      error('Failed to generate barcode stickers')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading items...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barcode Sticker</h1>
          <p className="text-gray-600 mt-1">
            Generate and print barcode stickers for your products
          </p>
        </div>
        
        <Button
          onClick={generateBarcodes}
          loading={generating}
          disabled={generating || selectedItems.length === 0}
          variant="primary"
          icon={<PrintIcon />}
        >
          {generating ? 'Generating...' : `Generate Stickers (${selectedItems.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Items Selection */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Items ({filteredItems.length})
              </h3>
              
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Select All ({filteredItems.length} items)
                </span>
              </label>
              
              <span className="text-sm text-gray-600">
                {selectedItems.length} selected
              </span>
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
                  onClick={() => handleItemSelect(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemSelect(item.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                        <p className="text-sm text-gray-600">Code: {item.item_code}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₹{item.selling_price}</p>
                        {item.barcode && (
                          <p className="text-xs text-gray-500">{item.barcode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="text-center py-8">
                  <BarcodeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No items found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search terms
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sticker Options */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sticker Options</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sticker Size
                </label>
                <select
                  value={stickerOptions.size}
                  onChange={(e) => setStickerOptions({...stickerOptions, size: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">Small (25mm x 15mm)</option>
                  <option value="medium">Medium (40mm x 25mm)</option>
                  <option value="large">Large (60mm x 40mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={stickerOptions.format}
                  onChange={(e) => setStickerOptions({...stickerOptions, format: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard (Code 128)</option>
                  <option value="qr">QR Code</option>
                  <option value="both">Both Barcode + QR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copies per Item
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={stickerOptions.copies}
                  onChange={(e) => setStickerOptions({...stickerOptions, copies: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Include on Sticker
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stickerOptions.includeName}
                      onChange={(e) => setStickerOptions({...stickerOptions, includeName: e.target.checked})}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Product Name</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stickerOptions.includeCode}
                      onChange={(e) => setStickerOptions({...stickerOptions, includeCode: e.target.checked})}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Product Code</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stickerOptions.includePrice}
                      onChange={(e) => setStickerOptions({...stickerOptions, includePrice: e.target.checked})}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Price</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="border-2 border-dashed border-gray-300 bg-white p-3 rounded text-center">
                <BarcodeIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-xs font-mono mb-1">|||||| |||| ||||</div>
                {stickerOptions.includeName && (
                  <div className="text-xs font-medium truncate">Sample Product</div>
                )}
                {stickerOptions.includeCode && (
                  <div className="text-xs text-gray-600">SP001</div>
                )}
                {stickerOptions.includePrice && (
                  <div className="text-xs font-bold">₹299</div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {stickerOptions.size} sticker preview
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BarcodeSticker