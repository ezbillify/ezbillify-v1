// pages/others/barcode-sticker.js
import { useRouter } from 'next/router'
import BarcodeSticker from '../../components/others/BarcodeSticker'

const BarcodeStickerPage = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Barcode Sticker</h1>
                <p className="text-sm text-gray-500">Generate and print barcode stickers for your products</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BarcodeSticker />
      </div>
    </div>
  )
}

export default BarcodeStickerPage