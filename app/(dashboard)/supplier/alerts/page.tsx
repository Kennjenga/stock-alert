'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection, updateDocument } from '@/app/hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';
import { StockAlert } from '@/app/types';
import Link from 'next/link';

export default function SupplierAlerts() {
  const { userData } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  
  // Fetch all alerts as a supplier
  const alertsConstraints = [
    orderBy('createdAt', 'desc')
  ];
  
  const { data: alerts, loading: alertsLoading } = useCollection<StockAlert>(
    'stockAlerts', 
    alertsConstraints
  );
  
  // Filter alerts based on selected filters
  const filteredAlerts = alerts?.filter(alert => {
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || alert.overallUrgency === urgencyFilter;
    return matchesStatus && matchesUrgency;
  });
  
  // Handle acknowledging an alert
  const handleAcknowledge = async (alertId: string) => {
    try {
      await updateDocument<StockAlert>('stockAlerts', alertId, {
        status: 'acknowledged'
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };
  
  // Handle fulfilling an alert
  const handleFulfill = async (alertId: string) => {
    try {
      await updateDocument<StockAlert>('stockAlerts', alertId, {
        status: 'fulfilled',
        resolvedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fulfill alert:', error);
    }
  };
  
  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Hospital Stock Alerts
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Respond to and manage hospital drug stock alerts
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="urgency-filter" className="block text-sm font-medium text-gray-700">
                Filter by Urgency
              </label>
              <select
                id="urgency-filter"
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Urgency Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alerts Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          {alertsLoading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredAlerts && filteredAlerts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hospital
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drugs
                  </th>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {alert.hospitalName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alert.facilityName}
                      </div>
                      {alert.location?.address && (
                        <div className="text-xs text-gray-400">
                          {alert.location.address}
                        </div>
                      )}
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{alert.drugs.length} item{alert.drugs.length !== 1 ? 's' : ''}</div>
                      <div className="text-xs text-gray-500">
                        {alert.drugs.reduce((sum, drug) => sum + drug.requestedQuantity, 0)} total units
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/supplier/alerts/${alert.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3 trust-secondary"
                      >
                        View Details
                      </Link>
                      
                      {alert.status === 'pending' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-amber-600 hover:text-amber-900 mr-3 warning-secondary"
                        >
                          Acknowledge
                        </button>
                      )}
                      
                      {alert.status === 'acknowledged' && (
                        <button
                          onClick={() => handleFulfill(alert.id)}
                          className="text-emerald-600 hover:text-emerald-900 success-secondary"
                        >
                          Mark Fulfilled
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No alerts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
