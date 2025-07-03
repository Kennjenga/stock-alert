// Service to handle SMS notifications with real API integration
import AfricasTalking from 'africastalking';
import { EnhancedSMSResponse, SMSDelivery } from '../types';
import { addDocument, updateDocument } from './firestore-server';

// Africa's Talking SMS response interface
interface AfricasTalkingSMSResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      status: string;
      cost: string;
      messageId: string;
    }>;
  };
}

// Initialize Africa's Talking with unified credentials
const credentials = {
  apiKey: process.env.AFRICA_TALKING_API_KEY || '',
  username: process.env.AFRICA_TALKING_USERNAME || 'pedi',
};

const africastalking = AfricasTalking(credentials);
const sms = africastalking.SMS;

// Enhanced SMS function with real API integration
export async function sendSMS(
  phoneNumber: string,
  message: string,
  alertId?: string
): Promise<EnhancedSMSResponse> {
  try {
    // Validate environment variables
    if (!process.env.AFRICA_TALKING_API_KEY || !process.env.AFRICA_TALKING_USERNAME) {
      console.error('Africa\'s Talking API credentials not configured');
      return {
        success: false,
        error: 'Africa\'s Talking API credentials not configured'
      };
    }

    // Format phone number for Kenya (ensure it starts with +254)
    const formattedPhone = formatKenyanPhoneNumber(phoneNumber);

    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Send SMS via Africa's Talking
    const options = {
      to: [formattedPhone],
      message: message,
      from: process.env.SMS_SENDER_ID || 'AFTKNG'
    };

    console.log(`Sending SMS to ${formattedPhone}: ${message}`);

    const response = await sms.send(options) as unknown as AfricasTalkingSMSResponse;

    if (response.SMSMessageData.Recipients.length > 0) {
      const recipient = response.SMSMessageData.Recipients[0];

      // Create delivery tracking record
      const deliveryRecord: Omit<SMSDelivery, 'id'> = {
        messageId: recipient.messageId,
        phoneNumber: formattedPhone,
        message: message,
        status: recipient.status === 'Success' ? 'sent' : 'failed',
        provider: 'africastalking',
        cost: recipient.cost ? parseFloat(recipient.cost.replace('KES ', '')) : undefined,
        failureReason: recipient.status !== 'Success' ? recipient.status : undefined,
        retryCount: 0,
        maxRetries: 3,
        alertId: alertId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save delivery record to database
      try {
        await addDocument<Omit<SMSDelivery, 'id'>>('smsDeliveries', deliveryRecord);
      } catch (dbError) {
        console.error('Failed to save SMS delivery record:', dbError);
      }

      if (recipient.status === 'Success') {
        return {
          success: true,
          messageId: recipient.messageId,
          deliveryId: recipient.messageId,
          cost: deliveryRecord.cost,
          provider: 'africastalking',
          estimatedDeliveryTime: new Date(Date.now() + 30000).toISOString() // 30 seconds estimate
        };
      } else {
        return {
          success: false,
          error: `SMS failed: ${recipient.status}`,
          messageId: recipient.messageId
        };
      }
    } else {
      return {
        success: false,
        error: 'No recipients in response'
      };
    }
  } catch (error) {
    console.error('Failed to send SMS:', error);

    // Log failed attempt
    try {
      const failedRecord: Omit<SMSDelivery, 'id'> = {
        messageId: `failed_${Date.now()}`,
        phoneNumber: phoneNumber,
        message: message,
        status: 'failed',
        provider: 'africastalking',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        maxRetries: 3,
        alertId: alertId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDocument<Omit<SMSDelivery, 'id'>>('smsDeliveries', failedRecord);
    } catch (dbError) {
      console.error('Failed to save failed SMS record:', dbError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}

// Format Kenyan phone numbers to international format
export function formatKenyanPhoneNumber(phoneNumber: string): string | null {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Handle different Kenyan number formats
  if (cleaned.startsWith('254')) {
    // Already in international format
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Local format (0712345678) -> +254712345678
    return `+254${cleaned.substring(1)}`;
  } else if (cleaned.length === 9) {
    // Without leading zero (712345678) -> +254712345678
    return `+254${cleaned}`;
  }

  // Invalid format
  return null;
}

// Function to format stock alert SMS message
export function formatStockAlertSMS(
  hospitalName: string,
  drugName: string,
  quantity: number,
  urgencyLevel: string,
  location?: string
): string {
  const urgencyEmoji = getUrgencyEmoji(urgencyLevel);
  const locationText = location ? ` Location: ${location}.` : '';

  return `${urgencyEmoji} STOCK ALERT: ${hospitalName} reports low stock of ${drugName}. Remaining: ${quantity} units. Urgency: ${urgencyLevel.toUpperCase()}.${locationText} Reply to acknowledge. - AFTKNG`;
}

// Function to format multiple drugs alert
export function formatMultipleDrugsAlertSMS(
  hospitalName: string,
  drugCount: number,
  highestUrgency: string,
  location?: string
): string {
  const urgencyEmoji = getUrgencyEmoji(highestUrgency);
  const locationText = location ? ` Location: ${location}.` : '';

  return `${urgencyEmoji} STOCK ALERT: ${hospitalName} reports low stock of ${drugCount} drugs. Highest urgency: ${highestUrgency.toUpperCase()}.${locationText} Check app for details. - AFTKNG`;
}

// Get emoji based on urgency level
function getUrgencyEmoji(urgencyLevel: string): string {
  switch (urgencyLevel.toLowerCase()) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '📢';
    case 'low': return 'ℹ️';
    default: return '📢';
  }
}

// Enhanced function to send alerts to multiple suppliers with filtering
export async function sendAlertToSuppliers(
  supplierPhones: string[],
  message: string,
  alertId?: string
): Promise<EnhancedSMSResponse[]> {
  try {
    const responses = await Promise.all(
      supplierPhones.map(phone => sendSMS(phone, message, alertId))
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

// Function to retry failed SMS deliveries
export async function retryFailedSMS(deliveryId: string): Promise<boolean> {
  try {
    // This would fetch the failed delivery record and retry
    // Implementation depends on your database structure
    console.log(`Retrying SMS delivery: ${deliveryId}`);

    // Update retry count
    await updateDocument<SMSDelivery>('smsDeliveries', deliveryId, {
      retryCount: 1, // This should be incremented from current value
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Failed to retry SMS:', error);
    return false;
  }
}

// Function to check SMS delivery status
export async function checkDeliveryStatus(messageId: string): Promise<string> {
  try {
    // In a real implementation, you would call Africa's Talking delivery reports API
    // For now, we'll simulate checking the status
    console.log(`Checking delivery status for message: ${messageId}`);

    // This would make an API call to check status
    // const status = await africastalking.SMS.fetchDeliveryReports({ messageId });

    return 'delivered'; // Simulated response
  } catch (error) {
    console.error('Failed to check delivery status:', error);
    return 'unknown';
  }
}

// Function to get SMS delivery statistics
export async function getSMSStatistics(alertId?: string): Promise<{
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}> {
  try {
    // This would query your database for SMS delivery statistics
    // Implementation depends on your database structure
    console.log(`Getting SMS statistics for alert: ${alertId}`);

    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0
    };
  } catch (error) {
    console.error('Failed to get SMS statistics:', error);
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0
    };
  }
}
