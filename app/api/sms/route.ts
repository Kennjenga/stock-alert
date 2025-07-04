import { NextResponse } from 'next/server';
import { sendSMS } from '@/app/lib/smsService';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { phoneNumber, message } = data;
    
    // Validate required parameters
    if (!phoneNumber || !message) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Send the SMS
    const result = await sendSMS(phoneNumber, message);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send SMS'
    }, { status: 500 });
  }
}
