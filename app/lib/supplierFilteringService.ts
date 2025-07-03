// Service to handle supplier filtering and alert distribution
import {
  StockAlert,
  SupplierPreferences,
  UserData,
  AlertDistribution,
  UrgencyLevel
} from '../types';
import { addDocument, queryDocuments, getAllDocuments } from './firestore-server';
import { sendSMS, formatStockAlertSMS, formatMultipleDrugsAlertSMS } from './smsService';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if current time is within business hours
function isWithinBusinessHours(businessHours?: SupplierPreferences['businessHours']): boolean {
  if (!businessHours) return true;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Check if today is a working day
  if (!businessHours.workingDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within business hours
  return currentTime >= businessHours.start && currentTime <= businessHours.end;
}

// Get eligible suppliers for a stock alert
export async function getEligibleSuppliers(alert: StockAlert): Promise<UserData[]> {
  try {
    // Get all suppliers
    const allSuppliers = await queryDocuments<UserData>('users', 'role', 'supplier');

    // Get all supplier preferences
    const allPreferences = await getAllDocuments<SupplierPreferences>('supplierPreferences');

    const eligibleSuppliers: UserData[] = [];

    for (const supplier of allSuppliers) {
      const preferences = allPreferences.find(p => p.supplierId === supplier.uid);
      
      if (await isSupplierEligible(supplier, preferences, alert)) {
        eligibleSuppliers.push(supplier);
      }
    }

    return eligibleSuppliers;
  } catch (error) {
    console.error('Error getting eligible suppliers:', error);
    return [];
  }
}

// Check if a supplier is eligible for an alert
async function isSupplierEligible(
  supplier: UserData,
  preferences: SupplierPreferences | undefined,
  alert: StockAlert
): Promise<boolean> {
  // If no preferences set, include supplier (backward compatibility)
  if (!preferences || !preferences.isActive) {
    return true;
  }

  // Check business hours
  if (!isWithinBusinessHours(preferences.businessHours)) {
    return false;
  }

  // Check urgency level preference
  if (preferences.urgencyLevels.length > 0 && 
      !preferences.urgencyLevels.includes(alert.overallUrgency)) {
    return false;
  }

  // Check drug categories
  if (preferences.drugCategories.length > 0) {
    const alertCategories = alert.drugs.map(drug => drug.category || 'general');
    const hasMatchingCategory = alertCategories.some(category => 
      preferences.drugCategories.includes(category)
    );
    if (!hasMatchingCategory) {
      return false;
    }
  }

  // Check geographic regions
  if (preferences.geographicRegions.length > 0 && alert.location?.address) {
    const hasMatchingRegion = preferences.geographicRegions.some(region =>
      alert.location?.address?.toLowerCase().includes(region.toLowerCase())
    );
    if (!hasMatchingRegion) {
      return false;
    }
  }

  // Check maximum distance
  if (preferences.maxDistance && 
      alert.location?.latitude && 
      alert.location?.longitude &&
      supplier.location) {
    // Parse supplier location (assuming format "lat,lng" or city name)
    const supplierCoords = parseLocation(supplier.location);
    if (supplierCoords) {
      const distance = calculateDistance(
        alert.location.latitude,
        alert.location.longitude,
        supplierCoords.lat,
        supplierCoords.lng
      );
      if (distance > preferences.maxDistance) {
        return false;
      }
    }
  }

  // Check minimum order value
  if (preferences.minimumOrderValue) {
    // Calculate estimated order value (this would need drug pricing data)
    const estimatedValue = calculateEstimatedOrderValue(alert);
    if (estimatedValue < preferences.minimumOrderValue) {
      return false;
    }
  }

  return true;
}

// Parse location string to coordinates (simplified implementation)
function parseLocation(location: string): { lat: number; lng: number } | null {
  // Try to parse "lat,lng" format
  const coords = location.split(',');
  if (coords.length === 2) {
    const lat = parseFloat(coords[0].trim());
    const lng = parseFloat(coords[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // For city names, you would typically use a geocoding service
  // For now, return null (distance check will be skipped)
  return null;
}

// Calculate estimated order value (simplified)
function calculateEstimatedOrderValue(alert: StockAlert): number {
  // This is a simplified calculation
  // In a real system, you would have drug pricing data
  return alert.drugs.reduce((total, drug) => {
    const estimatedPricePerUnit = 100; // Default price in local currency
    return total + (drug.requestedQuantity * estimatedPricePerUnit);
  }, 0);
}

// Distribute alert to eligible suppliers
export async function distributeAlertToSuppliers(alert: StockAlert): Promise<void> {
  try {
    const eligibleSuppliers = await getEligibleSuppliers(alert);
    
    console.log(`Distributing alert ${alert.id} to ${eligibleSuppliers.length} eligible suppliers`);

    for (const supplier of eligibleSuppliers) {
      await sendAlertToSupplier(supplier, alert);
    }
  } catch (error) {
    console.error('Error distributing alert to suppliers:', error);
  }
}

// Send alert to a specific supplier
async function sendAlertToSupplier(supplier: UserData, alert: StockAlert): Promise<void> {
  try {
    // Get supplier preferences for notification method
    const preferencesResults = await queryDocuments<SupplierPreferences>('supplierPreferences', 'supplierId', supplier.uid);
    const preferences = preferencesResults[0];

    const notificationMethods = preferences?.notificationMethods || ['sms'];

    for (const method of notificationMethods) {
      if (method === 'sms' && supplier.phoneNumber) {
        await sendSMSAlert(supplier, alert);
      } else if (method === 'email' && supplier.email) {
        // Email implementation would go here
        console.log(`Email alert would be sent to ${supplier.email}`);
      }
      // In-app notifications would be handled separately
    }
  } catch (error) {
    console.error(`Error sending alert to supplier ${supplier.uid}:`, error);
  }
}

// Send SMS alert to supplier via API
async function sendSMSAlert(supplier: UserData, alert: StockAlert): Promise<void> {
  try {
    let message: string;

    if (alert.drugs.length === 1) {
      const drug = alert.drugs[0];
      message = formatStockAlertSMS(
        alert.hospitalName,
        drug.drugName,
        drug.requestedQuantity,
        drug.urgencyLevel,
        alert.location?.address
      );
    } else {
      message = formatMultipleDrugsAlertSMS(
        alert.hospitalName,
        alert.drugs.length,
        alert.overallUrgency,
        alert.location?.address
      );
    }

    // Call SMS service directly
    const smsResponse = await sendSMS(supplier.phoneNumber!, message, alert.id);

    // Log the distribution
    const distributionLog: Omit<AlertDistribution, 'id'> = {
      alertId: alert.id,
      supplierId: supplier.uid,
      supplierName: supplier.name || supplier.facilityName || 'Unknown',
      notificationMethod: 'sms',
      status: smsResponse.success ? 'sent' : 'failed',
      sentAt: smsResponse.success ? new Date().toISOString() : null,
      failureReason: smsResponse.success ? null : smsResponse.error,
      messageId: smsResponse.messageId || null,
      createdAt: new Date().toISOString()
    };

    await addDocument<Omit<AlertDistribution, 'id'>>('alertDistributions', distributionLog);

  } catch (error) {
    console.error(`Error sending SMS alert to supplier ${supplier.uid}:`, error);
  }
}




