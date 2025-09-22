// pages/master-data/index.js
import MasterDataLayout from '../../components/master-data/MasterDataLayout'

export default function MasterDataIndex() {
  return (
    <MasterDataLayout>
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Welcome to Master Data Management
        </h2>
        <p className="text-gray-600 mb-8">
          Select a category from the sidebar to configure your foundational data settings.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Tax Rates</h3>
            <p className="text-blue-700 text-sm">Configure GST rates for invoicing</p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Units</h3>
            <p className="text-green-700 text-sm">Set up measurement units</p>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Payment Terms</h3>
            <p className="text-purple-700 text-sm">Define payment conditions</p>
          </div>
          
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-2">Bank Accounts</h3>
            <p className="text-yellow-700 text-sm">Manage company bank accounts</p>
          </div>
          
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-900 mb-2">Chart of Accounts</h3>
            <p className="text-red-700 text-sm">Organize your accounting structure</p>
          </div>
          
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-2">Currency</h3>
            <p className="text-indigo-700 text-sm">Multi-currency configurations</p>
          </div>
        </div>
      </div>
    </MasterDataLayout>
  )
}