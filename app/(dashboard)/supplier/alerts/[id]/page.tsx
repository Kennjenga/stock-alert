'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useDocument, updateDocument } from '@/app/hooks/useFirestore';
import { StockAlert, InventoryItem } from '@/app/types';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/app/lib/firebase';
import { runTransaction, collection, query, where, getDocs, doc } from 'firebase/firestore';


export default function AlertDetailsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const params = useParams();
  const alertId = params.id as string;

  const { data: stockAlert, loading: alertLoading, error } = useDocument<StockAlert>('stockAlerts', alertId);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: 'acknowledged' | 'fulfilled' | 'cancelled') => {
    if (!stockAlert) return;
    setLoading(true);
    try {
      if (newStatus === 'fulfilled') {
        // First, read all necessary data outside the transaction
        const inventoryCollectionRef = collection(db, 'inventory');
        const inventoryChecks = await Promise.all(
          stockAlert.drugs.map(drug => {
            const q = query(
              inventoryCollectionRef,
              where('hospitalId', '==', stockAlert.hospitalId),
              where('drugName', '==', drug.drugName)
            );
            return getDocs(q);
          })
        );

        await runTransaction(db, async (transaction) => {
          const alertRef = doc(db, 'stockAlerts', alertId);
          
          // 1. Update the alert status
          transaction.update(alertRef, { status: newStatus, resolvedAt: new Date().toISOString() });

          // 2. Update the hospital's inventory based on the pre-fetched data
          stockAlert.drugs.forEach((drug, index) => {
            const querySnapshot = inventoryChecks[index];
            const newExpiryDate = new Date();
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

            if (querySnapshot.empty) {
              // Drug not in inventory, create a new item
              const newInventoryItemRef = doc(inventoryCollectionRef);
              const newItem: Omit<InventoryItem, 'id'> = {
                hospitalId: stockAlert.hospitalId,
                drugName: drug.drugName,
                category: drug.category || 'Uncategorized',
                currentQuantity: drug.requestedQuantity,
                minimumThreshold: 10, // Default value
                unit: drug.unit,
                supplier: stockAlert.supplierId,
                supplierName: stockAlert.supplierName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastRestocked: new Date().toISOString(),
                expiryDate: newExpiryDate.toISOString(),
              };
              transaction.set(newInventoryItemRef, newItem);
            } else {
              // Drug exists, update its quantity
              const inventoryDoc = querySnapshot.docs[0];
              const inventoryItem = inventoryDoc.data() as InventoryItem;
              const newQuantity = (inventoryItem.currentQuantity || 0) + drug.requestedQuantity;
              transaction.update(inventoryDoc.ref, { 
                currentQuantity: newQuantity,
                updatedAt: new Date().toISOString(),
                lastRestocked: new Date().toISOString(),
                expiryDate: newExpiryDate.toISOString(),
              });
            }
          });
        });
      } else {
        // For other status changes, just update the alert
        await updateDocument('stockAlerts', alertId, { status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status', err);
      window.alert('Failed to update alert status.');
    } finally {
      setLoading(false);
    }
  };

  if (alertLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error || !stockAlert) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-red-600">Error</h2>
        <p className="text-gray-600 mt-2">Could not load the alert details. It might have been deleted or you may not have permission to view it.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alert Details</h1>
              <p className="mt-1 text-sm text-gray-500">From: <span className="font-medium text-gray-700">{stockAlert.hospitalName}</span></p>
              <p className="text-sm text-gray-500">Date: <span className="font-medium text-gray-700">{new Date(stockAlert.createdAt).toLocaleString()}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span
                className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                  ${stockAlert.status === 'pending' ? 'bg-red-100 text-red-800' : 
                    stockAlert.status === 'acknowledged' ? 'bg-blue-100 text-blue-800' :
                    stockAlert.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}`}
              >
                {stockAlert.status.charAt(0).toUpperCase() + stockAlert.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Drug Requirements */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Required Items</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stockAlert.drugs.map((drug, index) => (
              <div key={index} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{drug.drugName}</p>
                  <p className="text-sm text-gray-500">{drug.category}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-600">{drug.requestedQuantity} <span className="text-sm font-normal text-gray-600">{drug.unit}</span></p>
                  <p className="text-xs text-gray-500">Current: {drug.currentQuantity ?? 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium 
                    ${drug.urgencyLevel === 'critical' ? 'text-red-600' : 
                      drug.urgencyLevel === 'high' ? 'text-amber-600' : 
                      'text-blue-600'}`}>
                    Urgency: {drug.urgencyLevel.charAt(0).toUpperCase() + drug.urgencyLevel.slice(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {userData?.role === 'supplier' && stockAlert.status !== 'fulfilled' && stockAlert.status !== 'cancelled' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Alert Status</h3>
            <div className="flex space-x-3">
              {stockAlert.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange('acknowledged')}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? 'Acknowledging...' : 'Acknowledge Receipt'}
                </button>
              )}
              {stockAlert.status === 'acknowledged' && (
                <button
                  onClick={() => handleStatusChange('fulfilled')}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300"
                >
                  {loading ? 'Fulfilling...' : 'Mark as Fulfilled'}
                </button>
              )}
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
              >
                {loading ? 'Cancelling...' : 'Cancel Alert'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
