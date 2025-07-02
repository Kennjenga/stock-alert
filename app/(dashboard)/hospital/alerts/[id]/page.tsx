'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useDocument } from '../../../../hooks/useFirestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { StockAlert, UrgencyLevel } from '../../../../types';

export default function AlertDetailPage({ params }: { params: { id: string } }) {
  const { userData } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch the specific alert
  const { data: alert, loading, error } = useDocument<StockAlert>('stockAlerts', params.id);

  const getUrgencyColor = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelAlert = async () => {
    if (!alert || alert.status !== 'pending') return;
    
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'stockAlerts', params.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      router.refresh();
    } catch (error) {
      console.error('Error cancelling alert:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error loading alert details</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if user has permission to view this alert
  if (userData?.uid !== alert.hospitalId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">You don't have permission to view this alert</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Alert Details</h1>
                <p className="mt-1 text-sm text-gray-600">Alert ID: {alert.id}</p>
              </div>
              <div className="flex space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(alert.status)}`}>
                  {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor(alert.overallUrgency)}`}>
                  {alert.overallUrgency.charAt(0).toUpperCase() + alert.overallUrgency.slice(1)} Priority
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Alert Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Supplier</h3>
                  <p className="mt-1 text-sm text-gray-900">{alert.supplierName || 'Not assigned'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Created Date</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(alert.createdAt).toLocaleDateString()} at {new Date(alert.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Hospital</h3>
                  <p className="mt-1 text-sm text-gray-900">{alert.hospitalName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Facility</h3>
                  <p className="mt-1 text-sm text-gray-900">{alert.facilityName}</p>
                </div>
              </div>
            </div>

            {/* Drugs Requested */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Drugs Requested</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-4">
                  {alert.drugs.map((drug, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{drug.drugName}</h3>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Quantity:</span>
                              <span className="ml-1 text-gray-900">{drug.requestedQuantity} {drug.unit}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Urgency:</span>
                              <span className={`ml-1 px-2 py-1 rounded text-xs font-semibold ${getUrgencyColor(drug.urgencyLevel)}`}>
                                {drug.urgencyLevel.charAt(0).toUpperCase() + drug.urgencyLevel.slice(1)}
                              </span>
                            </div>
                            {drug.category && (
                              <div>
                                <span className="font-medium text-gray-700">Category:</span>
                                <span className="ml-1 text-gray-900">{drug.category}</span>
                              </div>
                            )}
                          </div>
                          {drug.notes && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-700">Notes:</span>
                              <p className="mt-1 text-gray-900">{drug.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {alert.notes && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{alert.notes}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Alerts
              </button>
              
              {alert.status === 'pending' && (
                <button
                  onClick={handleCancelAlert}
                  disabled={isUpdating}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Cancelling...' : 'Cancel Alert'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
