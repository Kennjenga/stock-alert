'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection } from '@/app/hooks/useFirestore';
import { where } from 'firebase/firestore';
import { StockAlert, UserData } from '@/app/types';
import Link from 'next/link';

export default function SupplierHospitalsPage() {
  const { userData } = useAuth();
  const [hospitals, setHospitals] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch alerts associated with the current supplier
  const { data: alerts } = useCollection<StockAlert>(
    'stockAlerts',
    [where('supplierId', '==', userData?.uid || '')],
    [userData?.uid]
  );

  // 2. Fetch all hospital users
  const { data: allHospitals } = useCollection<UserData>(
    'users',
    [where('role', '==', 'hospital')]
  );

  useEffect(() => {
    if (alerts && allHospitals) {
      // 3. Find unique hospital IDs from the alerts
      const hospitalIds = [...new Set(alerts.map(alert => alert.hospitalId))];
      
      // 4. Filter the full hospital list to get the ones associated with the supplier
      const associatedHospitals = allHospitals.filter(hospital => hospitalIds.includes(hospital.uid));
      
      setHospitals(associatedHospitals);
      setLoading(false);
    }
  }, [alerts, allHospitals]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold leading-tight text-gray-800">
            My Partner Hospitals
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Hospitals you are currently supplying or have received alerts from.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : hospitals.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hospital Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hospitals.map((hospital) => (
                    <tr key={hospital.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{hospital.facilityName || hospital.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{hospital.location || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{hospital.email}</div>
                        <div className="text-sm text-gray-500">{hospital.phoneNumber || ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No hospitals have sent you alerts yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
