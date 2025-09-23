import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import SectionCard from '../../components/shared/layout/SectionCard'
import Button from '../../components/shared/ui/Button'
import Badge from '../../components/shared/ui/Badge'
import { 
  CurrencyDollarIcon, 
  ScaleIcon, 
  BanknotesIcon,
  ClockIcon,
  BuildingLibraryIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

const MasterDataIndex = () => {
  const router = useRouter()
  const { company } = useAuth()
  const [stats, setStats] = useState({
    accounts: 0,
    taxRates: 0,
    units: 0,
    bankAccounts: 0,
    currencies: 0,
    paymentTerms: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (company?.id) {
      fetchStats()
    }
  }, [company?.id])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      const [
        accountsResult,
        taxRatesResult,
        unitsResult,
        bankAccountsResult,
        currenciesResult,
        paymentTermsResult
      ] = await Promise.all([
        supabase.from('chart_of_accounts').select('id').eq('company_id', company.id),
        supabase.from('tax_rates').select('id').eq('company_id', company.id),
        supabase.from('units').select('id').or(`company_id.eq.${company.id},company_id.is.null`),
        supabase.from('bank_accounts').select('id').eq('company_id', company.id),
        supabase.from('currencies').select('id').eq('company_id', company.id),
        supabase.from('payment_terms').select('id').eq('company_id', company.id)
      ])

      setStats({
        accounts: accountsResult.data?.length || 0,
        taxRates: taxRatesResult.data?.length || 0,
        units: unitsResult.data?.length || 0,
        bankAccounts: bankAccountsResult.data?.length || 0,
        currencies: currenciesResult.data?.length || 0,
        paymentTerms: paymentTermsResult.data?.length || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const masterDataItems = [
    {
      title: "Chart of Accounts",
      description: "Define your accounting structure with assets, liabilities, income, and expense accounts",
      icon: CurrencyDollarIcon,
      path: "/master-data/chart-of-accounts",
      color: "bg-blue-50 text-blue-600 border-blue-200",
      count: stats.accounts,
      setup: stats.accounts > 0,
      priority: "High"
    },
    {
      title: "Tax Rates",
      description: "Configure GST rates, VAT, and other tax calculations for your business",
      icon: ScaleIcon,
      path: "/master-data/tax-rates",
      color: "bg-green-50 text-green-600 border-green-200",
      count: stats.taxRates,
      setup: stats.taxRates > 0,
      priority: "High"
    },
    {
      title: "Units of Measurement",
      description: "Set up units like pieces, kilograms, meters with conversion factors",
      icon: ScaleIcon,
      path: "/master-data/units",
      color: "bg-purple-50 text-purple-600 border-purple-200",
      count: stats.units,
      setup: stats.units > 0,
      priority: "Medium"
    },
    {
      title: "Bank Accounts",
      description: "Add your business bank accounts for payment tracking and reconciliation",
      icon: BuildingLibraryIcon,
      path: "/master-data/bank-accounts",
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      count: stats.bankAccounts,
      setup: stats.bankAccounts > 0,
      priority: "High"
    },
    {
      title: "Currencies",
      description: "Multi-currency setup with exchange rates for international business",
      icon: GlobeAltIcon,
      path: "/master-data/currency",
      color: "bg-pink-50 text-pink-600 border-pink-200",
      count: stats.currencies,
      setup: stats.currencies > 0,
      priority: "Low"
    },
    {
      title: "Payment Terms",
      description: "Define payment terms like Net 30, Due on Receipt for customers and vendors",
      icon: ClockIcon,
      path: "/master-data/payment-terms",
      color: "bg-orange-50 text-orange-600 border-orange-200",
      count: stats.paymentTerms,
      setup: stats.paymentTerms > 0,
      priority: "Medium"
    }
  ]

  const setupProgress = masterDataItems.filter(item => item.setup).length
  const totalItems = masterDataItems.length
  const progressPercentage = (setupProgress / totalItems) * 100

  const getPriorityBadge = (priority) => {
    const colors = {
      High: 'red',
      Medium: 'yellow',
      Low: 'gray'
    }
    return <Badge color={colors[priority]}>{priority}</Badge>
  }

  if (loading) {
    return (
      <MasterDataLayout title="Master Data">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MasterDataLayout>
    )
  }

  return (
    <MasterDataLayout title="Master Data">
      <div className="space-y-6">
        {/* Setup Progress */}
        <SectionCard title="Setup Progress">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Master Data Configuration
              </span>
              <span className="text-sm text-gray-600">
                {setupProgress} of {totalItems} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {progressPercentage < 100 && (
            <div className="text-sm text-gray-600">
              Complete your master data setup to enable full EzBillify functionality
            </div>
          )}
          
          {progressPercentage === 100 && (
            <div className="text-sm text-green-600">
              ✓ Master data setup is complete! You're ready to start creating items and invoices.
            </div>
          )}
        </SectionCard>

        {/* Master Data Overview */}
        <SectionCard title="Master Data Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterDataItems.map((item) => {
              const Icon = item.icon
              
              return (
                <div
                  key={item.path}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(item.path)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {item.count}
                          </span>
                          <span className="text-sm text-gray-500">
                            {item.count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        
                        <Badge color={item.setup ? 'green' : 'red'}>
                          {item.setup ? 'Setup' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => router.push('/master-data/chart-of-accounts')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <CurrencyDollarIcon className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Setup Chart of Accounts</div>
                <div className="text-sm text-gray-500">Essential for financial tracking</div>
              </div>
            </Button>

            <Button
              onClick={() => router.push('/master-data/tax-rates')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <ScaleIcon className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Configure Tax Rates</div>
                <div className="text-sm text-gray-500">GST, VAT, and other taxes</div>
              </div>
            </Button>

            <Button
              onClick={() => router.push('/master-data/bank-accounts')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <BuildingLibraryIcon className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Add Bank Accounts</div>
                <div className="text-sm text-gray-500">For payment processing</div>
              </div>
            </Button>
          </div>
        </SectionCard>

        {/* Setup Recommendations */}
        {progressPercentage < 100 && (
          <SectionCard title="Setup Recommendations">
            <div className="space-y-3">
              {masterDataItems
                .filter(item => !item.setup && item.priority === 'High')
                .map(item => (
                  <div key={item.path} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">{item.title}</div>
                        <div className="text-sm text-red-700">High priority - Required for core functionality</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(item.path)}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Setup Now
                    </Button>
                  </div>
                ))}
            </div>
          </SectionCard>
        )}
      </div>
    </MasterDataLayout>
  )
}

export default MasterDataIndex