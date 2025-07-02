'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { where } from 'firebase/firestore';
import { StockAlert } from '@/app/types';

const StatCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
  <div className="bg-white shadow rounded-lg p-6">
    <h3 className="text-lg font-medium text-gray-500 truncate">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-2">{description}</p>
  </div>
);

export default function SupplierDashboard() {
  const { userData } = useAuth();

  const { data: alerts } = useCollection<StockAlert>(
    'stockAlerts',
    [where('supplierId', '==', userData?.uid || '')],
    [userData?.uid]
  );

  const pendingRequests = alerts?.filter(a => a.status === 'pending').length || 0;
  const fulfilledRequests = alerts?.filter(a => a.status === 'fulfilled').length || 0;
  const uniqueHospitals = alerts ? [...new Set(alerts.map(a => a.hospitalId))].length : 0;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Supplier Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Pending Requests" value={pendingRequests} description="New requests needing attention" />
        <StatCard title="Fulfilled Requests" value={fulfilledRequests} description="Requests fulfilled this month" />
        <StatCard title="Contracted Hospitals" value={uniqueHospitals} description="Hospitals you are supplying" />
      </div>
    </div>
  );
}
