// Service to handle SMS notifications
import { SMSResponse } from '../types';

// This function would use a real SMS gateway in production
export async function sendSMS(
  phoneNumber: string, 
  message: string
): Promise<SMSResponse> {
  try {
    // In a real application, you would integrate with an SMS provider API like Twilio, Africa's Talking, etc.
    // For now, let's simulate a successful SMS send
    console.log(`SMS sent to ${phoneNumber}: ${message}`);
    
    // Simulate API call
    const apiKey = process.env.NEXT_PUBLIC_SMS_API_KEY;
    
    if (!apiKey) {
      console.warn('SMS API key not configured');
    }
    
    // This is just for demonstration - in a real app, you would call the actual SMS API
    return {
      success: true,
      messageId: `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return {
      success: false,
      error: 'Failed to send SMS'
    };
  }
}

// Function to format stock alert SMS message
export function formatStockAlertSMS(
  hospitalName: string,
  drugName: string,
  quantity: number,
  urgencyLevel: string
): string {
  return `ALERT: ${hospitalName} reports low stock of ${drugName}. Remaining: ${quantity} units. Urgency: ${urgencyLevel.toUpperCase()}. Please respond ASAP.`;
}

// Function to send alerts to multiple suppliers
export async function sendAlertToSuppliers(
  supplierPhones: string[],
  message: string
): Promise<SMSResponse[]> {
  try {
    const responses = await Promise.all(
      supplierPhones.map(phone => sendSMS(phone, message))
    );
    
    return responses;
  } catch (error) {
    console.error('Failed to send alerts to suppliers:', error);
    return [{
      success: false,
      error: 'Failed to send batch SMS alerts'
    }];
  }
}
