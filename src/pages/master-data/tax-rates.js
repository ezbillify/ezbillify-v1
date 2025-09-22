// pages/master-data/tax-rates.js
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import TaxRateList from '../../components/master-data/TaxRateList'

export default function TaxRatesPage() {
  return (
    <MasterDataLayout activeTab="tax-rates">
      <TaxRateList />
    </MasterDataLayout>
  )
}