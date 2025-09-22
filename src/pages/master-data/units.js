// pages/master-data/units.js
import MasterDataLayout from '../../components/master-data/MasterDataLayout'
import UnitList from '../../components/master-data/UnitList'

export default function UnitsPage() {
  return (
    <MasterDataLayout activeTab="units">
      <UnitList />
    </MasterDataLayout>
  )
}