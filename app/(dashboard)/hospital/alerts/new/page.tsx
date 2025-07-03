'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { collection, addDoc, where } from 'firebase/firestore';
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
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  // Fetch inventory to suggest drugs
  const { data: inventory } = useCollection<InventoryItem>(
    'inventory',
    userData ? [where('hospitalId', '==', userData.uid)] : undefined,
    [userData?.uid]
  );

  // Fetch suppliers
  const { data: suppliers } = useCollection<UserData>(
    'users',
    [where('role', '==', 'supplier')],
    []
  );

  const handleAddDrug = () => {
    if (newDrug.drugName && newDrug.requestedQuantity && newDrug.requestedQuantity > 0) {
      const drugToAdd: DrugRequirement = {
        drugId: newDrug.drugId || '',
        drugName: newDrug.drugName,
        category: newDrug.category || 'general',
        requestedQuantity: newDrug.requestedQuantity,
        urgencyLevel: newDrug.urgencyLevel || 'medium',
        unit: newDrug.unit || 'units',
        notes: newDrug.notes || ''
      };
      setDrugs([...drugs, drugToAdd]);
      setNewDrug({ 
        drugName: '', 
        requestedQuantity: 1, 
        urgencyLevel: 'medium',
        unit: 'units',
        category: 'general',
        drugId: '',
        notes: ''
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
    if (!userData || drugs.length === 0) {
      setError('Please add at least one drug.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const overallUrgency = drugs.reduce((max, drug) => {
        const urgencies: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
        return urgencies.indexOf(drug.urgencyLevel) > urgencies.indexOf(max) ? drug.urgencyLevel : max;
      }, 'low' as UrgencyLevel);

      const alertData: Omit<StockAlert, 'id'> = {
        hospitalId: userData.uid,
        hospitalName: userData.name || 'Unknown Hospital',
        facilityName: userData.facilityName || userData.name || 'Unknown Facility',
        supplierId: selectedSupplier,
        drugs: drugs.map(drug => ({
          drugId: drug.drugId || '',
          drugName: drug.drugName,
          category: drug.category || 'general',
          requestedQuantity: drug.requestedQuantity,
          currentQuantity: drug.currentQuantity || 0,
          urgencyLevel: drug.urgencyLevel,
          unit: drug.unit,
          notes: drug.notes || ''
        })),
        status: 'pending',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        overallUrgency: overallUrgency,
        ...(userData.location && {
          location: {
            address: userData.location
          }
        })
      };

      // Debug: Log the alert data to help identify undefined fields
      console.log('Alert data being saved:', JSON.stringify(alertData, null, 2));
      
      // Check for undefined values recursively
      const hasUndefined = (obj: Record<string, unknown>, path = ''): string[] => {
        const undefinedFields: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (value === undefined) {
            undefinedFields.push(currentPath);
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            undefinedFields.push(...hasUndefined(value as Record<string, unknown>, currentPath));
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (item === undefined) {
                undefinedFields.push(`${currentPath}[${index}]`);
              } else if (item && typeof item === 'object') {
                undefinedFields.push(...hasUndefined(item as Record<string, unknown>, `${currentPath}[${index}]`));
              }
            });
          }
        }
        return undefinedFields;
      };

      const undefinedFields = hasUndefined(alertData);
      if (undefinedFields.length > 0) {
        console.error('Found undefined fields:', undefinedFields);
        setError(`Data validation failed. Please check all required fields.`);
        return;
      }

      // Create the alert
      const alertRef = await addDoc(collection(db, 'stockAlerts'), alertData);
      const alert: StockAlert = { id: alertRef.id, ...alertData };

      // Import and use the new filtering system to distribute alerts
      const { distributeAlertToSuppliers } = await import('@/app/lib/supplierFilteringService');
      await distributeAlertToSuppliers(alert, selectedSupplier);

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
            {/* Supplier Selection Section */}
            <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-medium text-gray-900">Select a Supplier *</h2>
                <div className="mt-4">
                    <select
                        id="supplier"
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                    >
                        <option value="" disabled>-- Choose a supplier --</option>
                        {suppliers && suppliers.map(supplier => (
                            <option key={supplier.uid} value={supplier.uid}>
                                {supplier.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Alert Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Smart Supplier Matching Removed</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>You are now required to select a specific supplier for your stock alert.</p>
                  </div>
                </div>
              </div>
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