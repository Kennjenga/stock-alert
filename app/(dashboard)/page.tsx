'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { where, orderBy, limit } from 'firebase/firestore';
import { StockAlert, InventoryItem } from '@/app/types';
import Link from 'next/link';

// Import for charts
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const { userData } = useAuth();
  const isHospital = userData?.role === 'hospital';
  
  // Fetch recent alerts with proper constraints
  const alertsConstraints = [
    ...(isHospital ? [where('hospitalId', '==', userData?.uid || '')] : [where('supplierId', '==', userData?.uid || '')]),
    orderBy('createdAt', 'desc'),
    limit(5)
  ];
  
  const { data: alerts, loading: alertsLoading } = useCollection<StockAlert>(
    'stockAlerts', 
    alertsConstraints,
    [userData?.uid, isHospital]
  );

  // Fetch inventory for hospitals
  const { data: inventory, loading: inventoryLoading } = useCollection<InventoryItem>(
    'inventory',
    isHospital ? [
      where('hospitalId', '==', userData?.uid || ''),
      orderBy('drugName', 'asc')
    ] : [],
    [userData?.uid, isHospital]
  );
  
  // For data visualization
  const [chartData, setChartData] = useState<any>(null);
  const [doughnutData, setDoughnutData] = useState<any>(null);
  
  // Calculate KPIs
  const kpis = {
    totalAlerts: alerts?.length || 0,
    pendingAlerts: alerts?.filter(a => a.status === 'pending').length || 0,
    acknowledgedAlerts: alerts?.filter(a => a.status === 'acknowledged').length || 0,
    fulfilledAlerts: alerts?.filter(a => a.status === 'fulfilled').length || 0,
    criticalAlerts: alerts?.filter(a => a.overallUrgency === 'critical').length || 0,
    lowStockItems: isHospital ? inventory?.filter(item => 
      item.currentQuantity <= item.minimumThreshold
    ).length || 0 : 0,
    outOfStockItems: isHospital ? inventory?.filter(item => 
      item.currentQuantity === 0
    ).length || 0 : 0,
    totalInventoryValue: isHospital ? inventory?.reduce((sum, item) => 
      sum + (item.currentQuantity * (item.costPerUnit || 0)), 0
    ) || 0 : 0
  };
  
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      // Prepare data for bar chart - alerts by urgency level
      const urgencyLevels = ['low', 'medium', 'high', 'critical'];
      const urgencyCounts = urgencyLevels.map(level => 
        alerts.filter(alert => alert.overallUrgency === level).length
      );
      
      setChartData({
        labels: urgencyLevels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        datasets: [
          {
            label: 'Alerts by Urgency Level',
            data: urgencyCounts,
            backgroundColor: [
              'rgba(16, 185, 129, 0.6)', // low - emerald
              'rgba(59, 130, 246, 0.6)', // medium - blue  
              'rgba(245, 158, 11, 0.6)', // high - amber
              'rgba(220, 38, 38, 0.6)',  // critical - red
            ],
            borderColor: [
              'rgba(16, 185, 129, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(220, 38, 38, 1)',
            ],
            borderWidth: 2,
          },
        ],
      });
      
      // Prepare data for doughnut chart - alerts by status
      const statusList = ['pending', 'acknowledged', 'fulfilled', 'cancelled'];
      const statusCounts = statusList.map(status => 
        alerts.filter(alert => alert.status === status).length
      );
      
      setDoughnutData({
        labels: statusList.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [
          {
            label: 'Alerts by Status',
            data: statusCounts,
            backgroundColor: [
              'rgba(220, 38, 38, 0.6)',   // pending - red
              'rgba(245, 158, 11, 0.6)',  // acknowledged - amber
              'rgba(16, 185, 129, 0.6)',  // fulfilled - emerald
              'rgba(156, 163, 175, 0.6)', // cancelled - gray
            ],
            borderColor: [
              'rgba(220, 38, 38, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(156, 163, 175, 1)',
            ],
            borderWidth: 2,
          },
        ],
      });
    } else {
      setChartData(null);
      setDoughnutData(null);
    }
  }, [alerts]);
  
  // Options for the bar chart
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Alerts by Urgency Level',
      },
    },
  };
  
  // Options for the doughnut chart
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Alerts by Status',
      },
    },
  };
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Welcome Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-gray-800">
                Welcome back, {userData?.name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {userData?.facilityName && (
                  <>
                    <span className="font-medium">{userData.facilityName}</span>
                    {' • '}
                  </>
                )}
                <span className="capitalize">{userData?.role === 'hospital' ? 'Healthcare Facility' : 'Medical Supplier'}</span>
                {userData?.location && (
                  <>
                    {' • '}
                    <span>{userData.location}</span>
                  </>
                )}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Link
                href={userData?.role === 'hospital' ? '/hospital/alerts/new' : '/supplier/alerts'}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 alert-primary transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {userData?.role === 'hospital' ? 'Report Low Stock' : 'View Requests'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Stat 1 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-600 rounded-md p-3 trust-primary">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-600 truncate">
                    Total Alerts
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-800">
                    {alertsLoading ? '...' : kpis.totalAlerts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-600 rounded-md p-3 alert-primary">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-600 truncate">
                    {isHospital ? 'Critical Items' : 'Urgent Requests'}
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-800">
                    {alertsLoading ? '...' : isHospital ? kpis.outOfStockItems : kpis.criticalAlerts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stat 3 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-600 rounded-md p-3 warning-primary">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-600 truncate">
                    {isHospital ? 'Low Stock Items' : 'Pending Actions'}
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-800">
                    {alertsLoading || inventoryLoading ? '...' : isHospital ? kpis.lowStockItems : kpis.pendingAlerts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stat 4 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-emerald-600 rounded-md p-3 success-primary">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-600 truncate">
                    {isHospital ? 'Total Inventory Value' : 'Completed Orders'}
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-800">
                    {alertsLoading || inventoryLoading ? '...' : isHospital 
                      ? `$${kpis.totalInventoryValue.toLocaleString()}` 
                      : kpis.fulfilledAlerts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts by Urgency Level</h3>
          {chartData ? (
            <Bar options={barOptions} data={chartData} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500 mt-2">No KPIs available</p>
                <p className="text-sm text-gray-400 mt-1">Data will appear here once you have alerts</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts by Status</h3>
          {doughnutData ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut options={doughnutOptions} data={doughnutData} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-gray-500 mt-2">No KPIs available</p>
                <p className="text-sm text-gray-400 mt-1">Status distribution will appear here once you have alerts</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Alerts */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Alerts
          </h3>
        </div>
        
        {alertsLoading ? (
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drugs
                  </th>
                  {!isHospital && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hospital
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {alert.drugs.length === 1 
                          ? alert.drugs[0].drugName 
                          : `${alert.drugs[0].drugName} +${alert.drugs.length - 1} more`
                        }
                      </div>
                      {alert.drugs.length > 1 && (
                        <div className="text-xs text-gray-500">
                          Multiple drugs requested
                        </div>
                      )}
                    </td>
                    {!isHospital && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{alert.hospitalName}</div>
                        <div className="text-xs text-gray-500">{alert.facilityName}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{alert.drugs.length} item{alert.drugs.length !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.overallUrgency === 'low' ? 'bg-emerald-100 text-emerald-800' : 
                          alert.overallUrgency === 'medium' ? 'bg-blue-100 text-blue-800' :
                          alert.overallUrgency === 'high' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'}`}>
                        {alert.overallUrgency.charAt(0).toUpperCase() + alert.overallUrgency.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${alert.status === 'pending' ? 'bg-red-100 text-red-800' : 
                          alert.status === 'acknowledged' ? 'bg-amber-100 text-amber-800' :
                          alert.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No alerts found</p>
            {isHospital && (
              <p className="mt-2">
                <Link href="/hospital/alerts/new" className="text-blue-600 hover:text-blue-500">
                  Create your first alert
                </Link>
              </p>
            )}
          </div>
        )}
        
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
          <div className="text-sm">
            <Link 
              href={isHospital ? '/hospital/alerts' : '/supplier/alerts'} 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              View all alerts
            </Link>
          </div>
        </div>
      </div>
      
      {/* USSD Instructions for Hospital Users */}
      {isHospital && (
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Report Low Stock via USSD
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="text-sm text-gray-700 space-y-4">
              <p>
                To report low stock levels using your mobile phone:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Dial <strong>*123*456#</strong> from your registered mobile number</li>
                <li>Select <strong>Report Low Stock</strong> from the menu</li>
                <li>Choose the drug name from the list</li>
                <li>Enter the remaining quantity</li>
                <li>Select the urgency level</li>
              </ol>
              <p className="mt-4 font-medium">
                You will receive airtime credit as a reward for timely reporting!
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
