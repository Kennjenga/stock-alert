// Service to handle USSD integrations
import { addDocument } from '../hooks/useFirestore';
import { Drug, StockAlert, UrgencyLevel } from '../types';
import { sendAlertToSuppliers, formatStockAlertSMS } from './smsService';
import { rewardUserWithAirtime } from './airtimeService';

// Function to process USSD data from clinic staff
export async function processUssdAlert(
  sessionId: string,
  userPhone: string,
  hospitalId: string,
  hospitalName: string,
  drugId: string,
  drugName: string,
  quantity: number,
  urgencyLevel: UrgencyLevel,
  location?: { latitude?: number; longitude?: number; address?: string }
): Promise<boolean> {
  try {
    // 1. Create a stock alert in Firestore
    const alertId = await addDocument<Omit<StockAlert, 'id'>>('stockAlerts', {
      hospitalId,
      hospitalName,
      drugId,
      drugName,
      quantity,
      urgencyLevel,
      location,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    // 2. Fetch supplier contacts from Firestore (in a real app)
    const supplierPhones = ['1234567890', '0987654321']; // Placeholder supplier numbers

    // 3. Format and send SMS alerts to suppliers
    const alertMessage = formatStockAlertSMS(
      hospitalName,
      drugName,
      quantity,
      urgencyLevel
    );
    
    await sendAlertToSuppliers(supplierPhones, alertMessage);

    // 4. Reward the user with airtime
    await rewardUserWithAirtime(userPhone, hospitalId, alertId);

    return true;
  } catch (error) {
    console.error('Failed to process USSD alert:', error);
    return false;
  }
}

// Mock function to simulate USSD menu flow
// In a real application, this would be an API endpoint handling USSD requests
export function handleUssdSession(
  sessionId: string,
  phoneNumber: string,
  userInput: string,
  currentLevel: number = 1
): { response: string; endSession: boolean; nextLevel?: number } {
  // Sample drugs for demonstration
  const drugs = [
    { id: '1', name: 'Paracetamol' },
    { id: '2', name: 'Amoxicillin' },
    { id: '3', name: 'Ibuprofen' },
    { id: '4', name: 'Ciprofloxacin' }
  ];

  const urgencyLevels = ['low', 'medium', 'high', 'critical'];

  // In a real application, this would be stored in a database or cache
  // For demo purposes, we'll use a simple switch statement
  switch (currentLevel) {
    case 1:
      // Initial menu
      return {
        response: `StockAlert\n1. Report Low Stock\n2. Check Status\n3. Exit`,
        endSession: false,
        nextLevel: 2
      };
      
    case 2:
      // Handle menu selection
      if (userInput === '1') {
        // Show list of drugs
        const drugList = drugs.map((drug, index) => `${index + 1}. ${drug.name}`).join('\n');
        return {
          response: `Select Drug:\n${drugList}`,
          endSession: false,
          nextLevel: 3
        };
      } else if (userInput === '2') {
        return {
          response: `Feature coming soon.`,
          endSession: true
        };
      } else {
        return {
          response: `Thank you for using StockAlert.`,
          endSession: true
        };
      }
      
    case 3:
      // Handle drug selection
      const drugIndex = parseInt(userInput) - 1;
      if (drugIndex >= 0 && drugIndex < drugs.length) {
        return {
          response: `Enter remaining quantity of ${drugs[drugIndex].name}:`,
          endSession: false,
          nextLevel: 4
        };
      } else {
        return {
          response: `Invalid selection. Please try again.`,
          endSession: true
        };
      }
      
    case 4:
      // Handle quantity input
      const quantity = parseInt(userInput);
      if (!isNaN(quantity) && quantity >= 0) {
        // Show urgency levels
        const urgencyMenu = urgencyLevels.map((level, index) => 
          `${index + 1}. ${level.charAt(0).toUpperCase() + level.slice(1)}`
        ).join('\n');
        
        return {
          response: `Select urgency level:\n${urgencyMenu}`,
          endSession: false,
          nextLevel: 5
        };
      } else {
        return {
          response: `Invalid quantity. Please try again.`,
          endSession: true
        };
      }
      
    case 5:
      // Handle urgency level selection and complete the process
      const urgencyIndex = parseInt(userInput) - 1;
      if (urgencyIndex >= 0 && urgencyIndex < urgencyLevels.length) {
        return {
          response: `Thank you. Your stock alert has been submitted. You will receive airtime credit shortly.`,
          endSession: true
        };
      } else {
        return {
          response: `Invalid urgency level. Please try again.`,
          endSession: true
        };
      }
      
    default:
      return {
        response: `Invalid session. Please dial *123# to start again.`,
        endSession: true
      };
  }
}
