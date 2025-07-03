import { NextRequest, NextResponse } from 'next/server';
import { sendRegistrationOTP } from '@/app/lib/otpService';
import { formatKenyanPhoneNumber } from '@/app/lib/smsService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, userData } = body;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!userData || !userData.email || !userData.name || !userData.role) {
      return NextResponse.json(
        { success: false, message: 'User data is required' },
        { status: 400 }
      );
    }

    // Format phone number
    const formattedPhone = formatKenyanPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Send OTP
    const result = await sendRegistrationOTP(formattedPhone, userData);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
