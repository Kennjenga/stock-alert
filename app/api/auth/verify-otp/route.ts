import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/app/lib/otpService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { otpId, otpCode } = body;

    // Validate required fields
    if (!otpId || !otpCode) {
      return NextResponse.json(
        { success: false, message: 'OTP ID and code are required' },
        { status: 400 }
      );
    }

    // Verify OTP
    const result = await verifyOTP(otpId, otpCode);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
