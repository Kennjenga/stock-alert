// Service to handle airtime rewards using Africa's Talking
import AfricasTalking from 'africastalking';
import { addDocument } from '../hooks/useFirestore';
import { AirtimeReward } from '../types';

// Initialize Africa's Talking with unified credentials
const credentials = {
  apiKey: process.env.AFRICA_TALKING_API_KEY || '',
  username: process.env.AFRICA_TALKING_USERNAME || 'pedi',
};

const africastalking = AfricasTalking(credentials);
const airtime = africastalking.AIRTIME;

// Enhanced function to send airtime rewards using Africa's Talking API
export async function rewardUserWithAirtime(
  phoneNumber: string,
  userId: string,
  alertId: string,
  amount: number = 50 // Default amount in KES
): Promise<boolean> {
  try {
    // Validate environment variables
    if (!process.env.AFRICA_TALKING_API_KEY || !process.env.AFRICA_TALKING_USERNAME) {
      console.warn('Africa\'s Talking API credentials not configured');
      // Still record the reward attempt
      await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
        userId,
        phoneNumber,
        amount,
        status: 'failed',
        alertId,
        failureReason: 'API credentials not configured',
        createdAt: new Date().toISOString()
      });
      return false;
    }

    console.log(`Sending ${amount} KES airtime to ${phoneNumber} for alert ${alertId}`);

    try {
      // Send airtime using Africa's Talking API
      const airtimeResponse = await airtime.send({
        recipients: [{
          phoneNumber: phoneNumber,
          currencyCode: 'KES',
          amount: amount
        }]
      });

      if (airtimeResponse.responses && airtimeResponse.responses.length > 0) {
        const response = airtimeResponse.responses[0];

        // Record the reward in the database
        await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
          userId,
          phoneNumber,
          amount,
          status: response.status === 'Success' ? 'sent' : 'failed',
          alertId,
          transactionId: response.requestId,
          failureReason: response.status !== 'Success' ? response.errorMessage : undefined,
          createdAt: new Date().toISOString()
        });

        return response.status === 'Success';
      } else {
        // Record failed attempt
        await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
          userId,
          phoneNumber,
          amount,
          status: 'failed',
          alertId,
          failureReason: 'No response from airtime API',
          createdAt: new Date().toISOString()
        });
        return false;
      }
    } catch (apiError) {
      console.error('Airtime API error:', apiError);

      // Record failed attempt
      await addDocument<Omit<AirtimeReward, 'id'>>('airtimeRewards', {
        userId,
        phoneNumber,
        amount,
        status: 'failed',
        alertId,
        failureReason: apiError instanceof Error ? apiError.message : 'Unknown API error',
        createdAt: new Date().toISOString()
      });
      return false;
    }
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
