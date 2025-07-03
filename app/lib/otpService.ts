// Service to handle OTP verification for user registration and authentication
import { addDocument, updateDocument, getDocumentById } from './firestore-server';
import { sendSMS } from './smsService';
import { OTPVerification, OTPResponse, OTPVerificationResponse, UserData } from '../types';

// Generate a 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Calculate expiry time based on configuration
function calculateExpiryTime(): string {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
  const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return expiryTime.toISOString();
}

// Send OTP for user registration
export async function sendRegistrationOTP(
  phoneNumber: string,
  userData: Partial<UserData>
): Promise<OTPResponse> {
  try {
    // Generate OTP code
    const otpCode = generateOTPCode();
    const expiresAt = calculateExpiryTime();
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

    // Create OTP verification record
    const otpVerification: Omit<OTPVerification, 'id'> = {
      phoneNumber,
      otpCode,
      purpose: 'registration',
      status: 'pending',
      attempts: 0,
      maxAttempts,
      expiresAt,
      userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save OTP record to database
    const otpId = await addDocument<Omit<OTPVerification, 'id'>>('otpVerifications', otpVerification);

    // Send SMS with OTP
    const message = `Your verification code for Stock Alert registration is: ${otpCode}. This code expires in ${process.env.OTP_EXPIRY_MINUTES || '5'} minutes.`;
    
    const smsResult = await sendSMS(phoneNumber, message);

    if (smsResult.success) {
      return {
        success: true,
        otpId,
        message: 'OTP sent successfully',
        expiresAt,
        attemptsRemaining: maxAttempts
      };
    } else {
      // Update OTP status to failed if SMS sending failed
      await updateDocument('otpVerifications', otpId, {
        status: 'failed',
        updatedAt: new Date().toISOString()
      });

      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.'
    };
  }
}

// Verify OTP code
export async function verifyOTP(
  otpId: string,
  otpCode: string
): Promise<OTPVerificationResponse> {
  try {
    // Get OTP verification record
    const otpRecord = await getDocumentById<OTPVerification>('otpVerifications', otpId);

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid OTP verification ID'
      };
    }

    // Check if OTP has expired
    const now = new Date();
    const expiryTime = new Date(otpRecord.expiresAt);
    
    if (now > expiryTime) {
      await updateDocument('otpVerifications', otpId, {
        status: 'expired',
        updatedAt: new Date().toISOString()
      });

      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Check if OTP is already verified or failed
    if (otpRecord.status !== 'pending') {
      return {
        success: false,
        message: 'OTP is no longer valid'
      };
    }

    // Check if maximum attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await updateDocument('otpVerifications', otpId, {
        status: 'failed',
        updatedAt: new Date().toISOString()
      });

      return {
        success: false,
        message: 'Maximum verification attempts exceeded'
      };
    }

    // Verify OTP code
    if (otpCode === otpRecord.otpCode) {
      // OTP is correct
      await updateDocument('otpVerifications', otpId, {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        userData: otpRecord.userData as UserData
      };
    } else {
      // OTP is incorrect, increment attempts
      const newAttempts = otpRecord.attempts + 1;
      const attemptsRemaining = otpRecord.maxAttempts - newAttempts;

      await updateDocument('otpVerifications', otpId, {
        attempts: newAttempts,
        status: newAttempts >= otpRecord.maxAttempts ? 'failed' : 'pending',
        updatedAt: new Date().toISOString()
      });

      return {
        success: false,
        message: `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining
      };
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    };
  }
}

// Resend OTP (for cases where user didn't receive the first one)
export async function resendOTP(otpId: string): Promise<OTPResponse> {
  try {
    // Get existing OTP record
    const otpRecord = await getDocumentById<OTPVerification>('otpVerifications', otpId);

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid OTP verification ID'
      };
    }

    // Check if OTP is already verified
    if (otpRecord.status === 'verified') {
      return {
        success: false,
        message: 'OTP is already verified'
      };
    }

    // Generate new OTP code and expiry time
    const newOtpCode = generateOTPCode();
    const newExpiresAt = calculateExpiryTime();

    // Update OTP record
    await updateDocument('otpVerifications', otpId, {
      otpCode: newOtpCode,
      expiresAt: newExpiresAt,
      attempts: 0, // Reset attempts
      status: 'pending',
      updatedAt: new Date().toISOString()
    });

    // Send new SMS with OTP
    const message = `Your new verification code for Stock Alert registration is: ${newOtpCode}. This code expires in ${process.env.OTP_EXPIRY_MINUTES || '5'} minutes.`;
    
    const smsResult = await sendSMS(otpRecord.phoneNumber, message);

    if (smsResult.success) {
      return {
        success: true,
        otpId,
        message: 'New OTP sent successfully',
        expiresAt: newExpiresAt,
        attemptsRemaining: otpRecord.maxAttempts
      };
    } else {
      return {
        success: false,
        message: 'Failed to send new OTP. Please try again.'
      };
    }
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.'
    };
  }
}

// Clean up expired OTP records (can be called periodically)
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    // This would typically be implemented with a batch query
    // For now, we'll leave this as a placeholder for future implementation
    console.log('Cleaning up expired OTP records...');
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}
