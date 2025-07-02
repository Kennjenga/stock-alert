'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { where } from 'firebase/firestore';
import { StockAlert, InventoryItem } from '@/app/types';

const StatCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
  <div className="bg-white shadow rounded-lg p-6">
    <h3 className="text-lg font-medium text-gray-500 truncate">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-2">{description}</p>
  </div>
);

export default function HospitalDashboard() {
  const { userData } = useAuth();

  const { data: alerts } = useCollection<StockAlert>(
    'stockAlerts',
    [where('hospitalId', '==', userData?.uid || '')],
    [userData?.uid]
  );

  const { data: inventory } = useCollection<InventoryItem>(
    'inventory',
    [where('hospitalId', '==', userData?.uid || '')],
    [userData?.uid]
  );

  const pendingAlerts = alerts?.filter(a => a.status === 'pending').length || 0;
  const fulfilledAlerts = alerts?.filter(a => a.status === 'fulfilled').length || 0;
  const lowStockItems = inventory?.filter(i => i.currentQuantity < i.minimumThreshold).length || 0;
  const outOfStockItems = inventory?.filter(i => i.currentQuantity === 0).length || 0;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Hospital Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Pending Alerts" value={pendingAlerts} description="Alerts awaiting supplier action" />
        <StatCard title="Fulfilled Alerts" value={fulfilledAlerts} description="Alerts successfully fulfilled this month" />
        <StatCard title="Low Stock Items" value={lowStockItems} description="Items below minimum threshold" />
        <StatCard title="Out of Stock Items" value={outOfStockItems} description="Items completely out of stock" />
      </div>
    </div>
  );
}
