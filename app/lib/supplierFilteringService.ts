'use server';

// Service to handle supplier filtering and alert distribution
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { 
  StockAlert, 
  SupplierPreferences, 
  UserData, 
  AlertDistribution
} from '../types';
import { sendSMS, formatStockAlertSMS, formatMultipleDrugsAlertSMS } from './smsService';

// Distribute alert to a specific supplier
export async function distributeAlertToSuppliers(alert: StockAlert, supplierId: string): Promise<void> {
  try {
    const supplierRef = doc(db, 'users', supplierId);
    const supplierSnap = await getDoc(supplierRef);

    if (!supplierSnap.exists()) {
      console.error(`Supplier with ID ${supplierId} not found.`);
      return;
    }

    const supplier = { ...supplierSnap.data(), uid: supplierSnap.id } as UserData;
    
    console.log(`Distributing alert ${alert.id} to selected supplier ${supplier.name}`);

    await sendAlertToSupplier(supplier, alert);

  } catch (error) {
    console.error('Error distributing alert to supplier:', error);
  }
}

// Send alert to a specific supplier
async function sendAlertToSupplier(supplier: UserData, alert: StockAlert): Promise<void> {
  try {
    // Get supplier preferences for notification method
    const preferencesQuery = query(
      collection(db, 'supplierPreferences'),
      where('supplierId', '==', supplier.uid)
    );
    const preferencesSnapshot = await getDocs(preferencesQuery);
    const preferences = preferencesSnapshot.docs[0]?.data() as SupplierPreferences;

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

// Send SMS alert to supplier
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

    const smsResponse = await sendSMS(supplier.phoneNumber!, message, alert.id);

    // Log the distribution
    const distributionLog: Omit<AlertDistribution, 'id'> = {
      alertId: alert.id,
      supplierId: supplier.uid,
      supplierName: supplier.name || supplier.facilityName || 'Unknown',
      notificationMethod: 'sms',
      status: smsResponse.success ? 'sent' : 'failed',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...(smsResponse.messageId && { messageId: smsResponse.messageId }),
      ...(smsResponse.error && { failureReason: smsResponse.error })
    };

    // Use server-side addDoc
    await addDoc(collection(db, 'alertDistributions'), distributionLog);

  } catch (error) {
    console.error(`Error sending SMS alert to supplier ${supplier.uid}:`, error);
  }
}
