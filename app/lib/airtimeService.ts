// Service to handle airtime rewards
import { addDocument } from '../hooks/useFirestore';
import { AirtimeReward } from '../types';

// This function would use a real airtime API in production
export async function rewardUserWithAirtime(
  phoneNumber: string,
  userId: string,
  alertId: string,
  amount: number = 50 // Default amount in local currency
): Promise<boolean> {
  try {
    // In a real application, you would integrate with an Airtime provider API
    // For example, Africa's Talking, Reloadly, etc.
    console.log(`Rewarding ${phoneNumber} with ${amount} airtime for alert ${alertId}`);
    
    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_AIRTIME_API_KEY;
    if (!apiKey) {
      console.warn('Airtime API key not configured');
    }
    
    // Record the reward in the database
    await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
      userId,
      phoneNumber,
      amount,
      status: 'sent', // In a real app, this would initially be 'pending'
      alertId,
      createdAt: new Date().toISOString()
    });
    
    // In a real application, you would await the API response
    // and update the status accordingly
    
    return true;
  } catch (error) {
    console.error('Failed to send airtime reward:', error);
    
    // Record the failed attempt
    await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
      userId,
      phoneNumber,
      amount,
      status: 'failed',
      alertId,
      createdAt: new Date().toISOString()
    });
    
    return false;
  }
}
