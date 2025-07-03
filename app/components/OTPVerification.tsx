'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UserData } from '@/app/types';

interface OTPVerificationProps {
  otpId: string;
  phoneNumber: string;
  onVerificationSuccess: (userData: UserData) => void;
  onCancel: () => void;
}

interface OTPFormValues {
  otpCode: string;
}

export default function OTPVerification({
  otpId,
  phoneNumber,
  onVerificationSuccess,
  onCancel
}: OTPVerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<OTPFormValues>();

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: OTPFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpId,
          otpCode: data.otpCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onVerificationSuccess(result.userData);
      } else {
        setError(result.message);
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
        reset(); // Clear the form
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);
      setError(null);

      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otpId }),
      });

      const result = await response.json();

      if (result.success) {
        setTimeRemaining(300); // Reset timer to 5 minutes
        setCanResend(false);
        setAttemptsRemaining(result.attemptsRemaining);
        reset(); // Clear the form
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Phone Number
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent a verification code to{' '}
            <span className="font-medium text-blue-600">{phoneNumber}</span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="otpCode" className="block text-sm font-medium leading-6 text-gray-900">
              Verification Code
            </label>
            <div className="mt-2">
              <input
                id="otpCode"
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit code"
                {...register('otpCode', {
                  required: 'Verification code is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Please enter a valid 6-digit code',
                  },
                })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3 text-center text-lg tracking-widest"
              />
              {errors.otpCode && (
                <p className="mt-1 text-sm text-red-600">{errors.otpCode.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              {timeRemaining > 0 ? (
                <span className="text-gray-600">
                  Code expires in {formatTime(timeRemaining)}
                </span>
              ) : (
                <span className="text-red-600">Code has expired</span>
              )}
            </div>
            {attemptsRemaining !== null && (
              <div className="text-sm text-gray-600">
                {attemptsRemaining} attempts remaining
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading || timeRemaining === 0}
              className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading || timeRemaining === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={!canResend || isResending}
              className={`flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                !canResend || isResending
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Cancel and go back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
