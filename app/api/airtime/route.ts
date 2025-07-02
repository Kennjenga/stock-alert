import { NextResponse } from 'next/server';
import { rewardUserWithAirtime } from '@/app/lib/airtimeService';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { phoneNumber, userId, alertId, amount } = data;
    
    // Validate required parameters
    if (!phoneNumber || !userId || !alertId) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Process the airtime reward
    const success = await rewardUserWithAirtime(
      phoneNumber, 
      userId, 
      alertId, 
      amount
    );
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Airtime reward processed successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to process airtime reward'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Airtime reward error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process airtime reward'
    }, { status: 500 });
  }
}
