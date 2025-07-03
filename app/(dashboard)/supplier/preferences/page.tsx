'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCollection, addDocument, updateDocument } from '@/app/hooks/useFirestore';
import { where } from 'firebase/firestore';
import { SupplierPreferences, UrgencyLevel } from '@/app/types';

const drugCategories = [
  'Antibiotics',
  'Analgesics',
  'Cardiovascular',
  'Diabetes',
  'Respiratory',
  'Vaccines',
  'Emergency',
  'Surgical',
  'Pediatric',
  'General'
];

const kenyanRegions = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Malindi',
  'Kitale',
  'Garissa',
  'Kakamega',
  'Machakos',
  'Meru',
  'Nyeri',
  'Kericho',
  'Embu'
];

const urgencyLevels: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

export default function SupplierPreferencesPage() {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing preferences
  const { data: existingPreferences } = useCollection<SupplierPreferences>(
    'supplierPreferences',
    userData ? [where('supplierId', '==', userData.uid)] : undefined,
    [userData?.uid]
  );

  const currentPreferences = existingPreferences?.[0];

  const [preferences, setPreferences] = useState<Partial<SupplierPreferences>>({
    drugCategories: [],
    urgencyLevels: ['medium', 'high', 'critical'],
    geographicRegions: [],
    maxDistance: 50,
    minimumOrderValue: 1000,
    notificationMethods: ['sms'],
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Nairobi',
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    },
    isActive: true
  });

  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences);
    }
  }, [currentPreferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const preferencesData: Omit<SupplierPreferences, 'id'> = {
        supplierId: userData.uid,
        drugCategories: preferences.drugCategories || [],
        urgencyLevels: preferences.urgencyLevels || [],
        geographicRegions: preferences.geographicRegions || [],
        maxDistance: preferences.maxDistance,
        minimumOrderValue: preferences.minimumOrderValue,
        notificationMethods: preferences.notificationMethods || ['sms'],
        businessHours: preferences.businessHours,
        isActive: preferences.isActive ?? true,
        createdAt: currentPreferences?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (currentPreferences) {
        await updateDocument<SupplierPreferences>('supplierPreferences', currentPreferences.id, preferencesData);
      } else {
        await addDocument<Omit<SupplierPreferences, 'id'>>('supplierPreferences', preferencesData);
      }

      setSuccess('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      drugCategories: checked
        ? [...(prev.drugCategories || []), category]
        : (prev.drugCategories || []).filter(c => c !== category)
    }));
  };

  const handleRegionChange = (region: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      geographicRegions: checked
        ? [...(prev.geographicRegions || []), region]
        : (prev.geographicRegions || []).filter(r => r !== region)
    }));
  };

  const handleUrgencyChange = (urgency: UrgencyLevel, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      urgencyLevels: checked
        ? [...(prev.urgencyLevels || []), urgency]
        : (prev.urgencyLevels || []).filter(u => u !== urgency)
    }));
  };

  const handleNotificationMethodChange = (method: 'sms' | 'email' | 'inApp', checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notificationMethods: checked
        ? [...(prev.notificationMethods || []), method]
        : (prev.notificationMethods || []).filter(m => m !== method)
    }));
  };

  const handleWorkingDayChange = (day: number, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours!,
        workingDays: checked
          ? [...(prev.businessHours?.workingDays || []), day]
          : (prev.businessHours?.workingDays || []).filter(d => d !== day)
      }
    }));
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Alert Preferences
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure which alerts you want to receive and how you want to be notified
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Active Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={preferences.isActive}
              onChange={(e) => setPreferences(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Receive stock alerts (uncheck to pause all notifications)
            </label>
          </div>
        </div>

        {/* Drug Categories */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Drug Categories</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the drug categories you can supply. Leave empty to receive alerts for all categories.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {drugCategories.map(category => (
              <div key={category} className="flex items-center">
                <input
                  id={`category-${category}`}
                  type="checkbox"
                  checked={(preferences.drugCategories || []).includes(category)}
                  onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`category-${category}`} className="ml-2 block text-sm text-gray-900">
                  {category}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Regions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Regions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the regions you serve. Leave empty to receive alerts from all regions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kenyanRegions.map(region => (
              <div key={region} className="flex items-center">
                <input
                  id={`region-${region}`}
                  type="checkbox"
                  checked={(preferences.geographicRegions || []).includes(region)}
                  onChange={(e) => handleRegionChange(region, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`region-${region}`} className="ml-2 block text-sm text-gray-900">
                  {region}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency Levels */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Urgency Levels</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the urgency levels you want to be notified about.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {urgencyLevels.map(urgency => (
              <div key={urgency} className="flex items-center">
                <input
                  id={`urgency-${urgency}`}
                  type="checkbox"
                  checked={(preferences.urgencyLevels || []).includes(urgency)}
                  onChange={(e) => handleUrgencyChange(urgency, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`urgency-${urgency}`} className="ml-2 block text-sm text-gray-900 capitalize">
                  {urgency}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Distance and Order Value */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery & Order Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="maxDistance" className="block text-sm font-medium text-gray-700">
                Maximum Distance (km)
              </label>
              <input
                type="number"
                id="maxDistance"
                value={preferences.maxDistance || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || undefined }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum distance you're willing to deliver (leave empty for no limit)
              </p>
            </div>
            <div>
              <label htmlFor="minimumOrderValue" className="block text-sm font-medium text-gray-700">
                Minimum Order Value (KES)
              </label>
              <input
                type="number"
                id="minimumOrderValue"
                value={preferences.minimumOrderValue || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, minimumOrderValue: parseInt(e.target.value) || undefined }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 1000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum order value you're interested in (leave empty for no minimum)
              </p>
            </div>
          </div>
        </div>

        {/* Notification Methods */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Methods</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to receive alerts.
          </p>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="notification-sms"
                type="checkbox"
                checked={(preferences.notificationMethods || []).includes('sms')}
                onChange={(e) => handleNotificationMethodChange('sms', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification-sms" className="ml-2 block text-sm text-gray-900">
                SMS (recommended for urgent alerts)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notification-email"
                type="checkbox"
                checked={(preferences.notificationMethods || []).includes('email')}
                onChange={(e) => handleNotificationMethodChange('email', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification-email" className="ml-2 block text-sm text-gray-900">
                Email
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="notification-inapp"
                type="checkbox"
                checked={(preferences.notificationMethods || []).includes('inApp')}
                onChange={(e) => handleNotificationMethodChange('inApp', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification-inapp" className="ml-2 block text-sm text-gray-900">
                In-app notifications
              </label>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set your business hours to receive alerts only during working hours.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={preferences.businessHours?.start || '08:00'}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  businessHours: {
                    ...prev.businessHours!,
                    start: e.target.value
                  }
                }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={preferences.businessHours?.end || '18:00'}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  businessHours: {
                    ...prev.businessHours!,
                    end: e.target.value
                  }
                }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center">
                  <input
                    id={`day-${index}`}
                    type="checkbox"
                    checked={(preferences.businessHours?.workingDays || []).includes(index)}
                    onChange={(e) => handleWorkingDayChange(index, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`day-${index}`} className="ml-2 block text-sm text-gray-900">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
