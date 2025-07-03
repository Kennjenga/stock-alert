import { NextRequest, NextResponse } from 'next/server';
import { resendOTP } from '@/app/lib/otpService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { otpId } = body;

    // Validate required fields
    if (!otpId) {
      return NextResponse.json(
        { success: false, message: 'OTP ID is required' },
        { status: 400 }
      );
    }

    // Resend OTP
    const result = await resendOTP(otpId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in resend-otp API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
