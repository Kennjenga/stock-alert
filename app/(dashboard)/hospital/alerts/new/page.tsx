'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { collection, addDoc, doc, getDoc, where } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { DrugRequirement, InventoryItem, UserData, StockAlert, UrgencyLevel } from '@/app/types';

export default function NewAlertPage() {
  const { userData } = useAuth();
  const router = useRouter();
  
  const [drugs, setDrugs] = useState<DrugRequirement[]>([]);
  const [newDrug, setNewDrug] = useState<Partial<DrugRequirement>>({ 
    drugName: '', 
    requestedQuantity: 1, 
    urgencyLevel: 'medium',
    unit: 'units'
  });
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory to suggest drugs
  const { data: inventory } = useCollection<InventoryItem>(
    'inventory',
    userData ? [where('hospitalId', '==', userData.uid)] : undefined,
    [userData?.uid]
  );

  // Fetch suppliers
  const { data: suppliers, loading: suppliersLoading } = useCollection<UserData>(
    'users',
    [where('role', '==', 'supplier')],
    []
  );

  const sortedSuppliers = suppliers?.sort((a, b) => (a.name || '').localeCompare(b.name || '')) || [];

  const handleAddDrug = () => {
    if (newDrug.drugName && newDrug.requestedQuantity && newDrug.requestedQuantity > 0) {
      const drugToAdd: DrugRequirement = {
        drugName: newDrug.drugName,
        requestedQuantity: newDrug.requestedQuantity,
        urgencyLevel: newDrug.urgencyLevel || 'medium',
        unit: newDrug.unit || 'units',
        drugId: newDrug.drugId,
        category: newDrug.category,
        notes: newDrug.notes
      };
      setDrugs([...drugs, drugToAdd]);
      setNewDrug({ 
        drugName: '', 
        requestedQuantity: 1, 
        urgencyLevel: 'medium',
        unit: 'units'
      });
    } else {
      setError('Please provide a valid drug name and quantity.');
    }
  };

  const handleRemoveDrug = (index: number) => {
    setDrugs(drugs.filter((_, i) => i !== index));
  };

  // TODO: Implement inventory selection feature
  // const handleInventorySelect = (inventoryItemId: string) => {
  //   const selectedItem = inventory?.find(item => item.id === inventoryItemId);
  //   if (selectedItem) {
  //     setNewDrug({
  //       drugId: selectedItem.drugId,
  //       drugName: selectedItem.drugName,
  //       requestedQuantity: selectedItem.minimumThreshold,
  //       urgencyLevel: 'medium',
  //       unit: selectedItem.unit,
  //       category: selectedItem.category
  //     });
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || drugs.length === 0 || !selectedSupplier) {
      setError('Please add at least one drug and select a supplier.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supplierDoc = await getDoc(doc(db, 'users', selectedSupplier));
      const supplierData = supplierDoc.data() as UserData;

      const overallUrgency = drugs.reduce((max, drug) => {
        const urgencies: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
        return urgencies.indexOf(drug.urgencyLevel) > urgencies.indexOf(max) ? drug.urgencyLevel : max;
      }, 'low' as UrgencyLevel);

      const alertData: Omit<StockAlert, 'id'> = {
        hospitalId: userData.uid,
        hospitalName: userData.name || '',
        facilityName: userData.facilityName || '',
        supplierId: selectedSupplier,
        supplierName: supplierData.name || '',
        drugs: drugs,
        status: 'pending',
        notes: notes,
        createdAt: new Date().toISOString(),
        overallUrgency: overallUrgency
      };

      await addDoc(collection(db, 'stockAlerts'), alertData);
      
      router.push('/hospital/alerts');

    } catch (err: unknown) {
      console.error('Error creating alert:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stock alert.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Create New Stock Alert</h1>
            <p className="mt-1 text-sm text-gray-600">Report low stock levels to your medical supplier.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <label htmlFor="supplier" className="text-sm font-medium text-gray-700">Select Supplier *</label>
              <select
                id="supplier"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="" disabled>{suppliersLoading ? 'Loading suppliers...' : '-- Select a supplier --'}</option>
                {sortedSuppliers.map(supplier => (
                  <option key={supplier.uid} value={supplier.uid}>{supplier.name} - {supplier.facilityName}</option>
                ))}
              </select>
            </div>

            {/* Drug Selection Section */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900">Drugs Required</h2>
              <div className="mt-4 p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label htmlFor="drugName" className="block text-sm font-medium text-gray-700">Drug Name *</label>
                    <input
                      type="text"
                      id="drugName"
                      value={newDrug.drugName || ''}
                      onChange={(e) => setNewDrug({ ...newDrug, drugName: e.target.value })}
                      placeholder="e.g., Paracetamol 500mg"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      list="inventory-suggestions"
                    />
                    {inventory && (
                      <datalist id="inventory-suggestions">
                        {inventory.map(item => (
                          <option key={item.id} value={item.drugName} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div>
                    <label htmlFor="requestedQuantity" className="block text-sm font-medium text-gray-700">Quantity *</label>
                    <input
                      type="number"
                      id="requestedQuantity"
                      value={newDrug.requestedQuantity || 1}
                      onChange={(e) => setNewDrug({ ...newDrug, requestedQuantity: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      id="unit"
                      value={newDrug.unit || 'units'}
                      onChange={(e) => setNewDrug({ ...newDrug, unit: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="tablets, bottles, etc."
                    />
                  </div>
                  <div>
                    <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">Urgency *</label>
                    <select
                      id="urgency"
                      value={newDrug.urgencyLevel || 'medium'}
                      onChange={(e) => setNewDrug({ ...newDrug, urgencyLevel: e.target.value as UrgencyLevel })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddDrug}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Drug to List
                  </button>
                </div>
              </div>
            </div>

            {/* Added Drugs List */}
            {drugs.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-md font-medium text-gray-800">Request List</h3>
                <ul className="mt-2 divide-y divide-gray-200 border border-gray-200 rounded-md">
                  {drugs.map((drug, index) => (
                    <li key={index} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{drug.drugName}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {drug.requestedQuantity} {drug.unit} | 
                          Urgency: <span className="font-medium capitalize">{drug.urgencyLevel}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDrug(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            <div className="border-t border-gray-200 pt-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Any extra details for the supplier..."
              ></textarea>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submission */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || drugs.length === 0 || !selectedSupplier}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Submitting...' : 'Submit Alert'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}