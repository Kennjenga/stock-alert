'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { StockAlert, UrgencyLevel } from '@/app/types';

// Helper function to determine urgency color
const getUrgencyColor = (urgency: UrgencyLevel) => {
  switch (urgency) {
    case 'low': return 'bg-emerald-100 text-emerald-800';
    case 'medium': return 'bg-blue-100 text-blue-800';
    case 'high': return 'bg-amber-100 text-amber-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to determine status color
const getStatusColor = (status: 'pending' | 'acknowledged' | 'fulfilled' | 'cancelled') => {
  switch (status) {
    case 'pending': return 'bg-red-100 text-red-800';
    case 'acknowledged': return 'bg-amber-100 text-amber-800';
    case 'fulfilled': return 'bg-emerald-100 text-emerald-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function HospitalAlertsPage() {
  const { userData } = useAuth();
  const [flattenedAlerts, setFlattenedAlerts] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: alerts, loading, error } = useCollection<StockAlert>(
    'stockAlerts',
    userData ? [where('hospitalId', '==', userData.uid)] : undefined,
    [userData?.uid]
  );

  useEffect(() => {
    if (alerts) {
      // Flatten alerts to have one row per drug
      const flatAlerts = alerts.flatMap(alert => 
        alert.drugs.map(drug => ({
          ...alert,
          drug,
        }))
      );
      
      // Apply filtering
      let filteredAlerts = flatAlerts;
      if (statusFilter !== 'all') {
        filteredAlerts = filteredAlerts.filter(a => a.status === statusFilter);
      }

      // Apply sorting
      const sortedAlerts = [...filteredAlerts].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });

      setFlattenedAlerts(sortedAlerts);
    }
  }, [alerts, sortOrder, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error))}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-800">Stock Alerts</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and track all stock alerts sent to suppliers.
            </p>
          </div>
          <Link
            href="/hospital/alerts/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 alert-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Report New Low Stock
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sort by Date {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        {/* Alerts Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {flattenedAlerts.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {flattenedAlerts.map((item, index) => (
                    <tr key={`${item.id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{item.drug.drugName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.supplierName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.drug.requestedQuantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(item.drug.urgencyLevel)}`}>
                          {item.drug.urgencyLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/hospital/alerts/${item.id}`} className="text-blue-600 hover:text-blue-800">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter === 'all' 
                    ? "You haven't created any alerts yet."
                    : `No alerts with the status "${statusFilter}" found.`}
                </p>
                <div className="mt-6">
                  <Link
                    href="/hospital/alerts/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create New Alert
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
