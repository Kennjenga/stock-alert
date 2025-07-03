'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useForm } from 'react-hook-form';
import { UserRole } from '@/app/types';
import OTPVerification from '@/app/components/OTPVerification';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  facilityName?: string;
  location?: string;
  phoneNumber: string;
}

export default function Register() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<RegisterFormValues | null>(null);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormValues>();
  const password = watch('password');
  
  const onSubmit = async (data: RegisterFormValues) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate phone number is provided
    if (!data.phoneNumber) {
      setError('Phone number is required for verification');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Store registration data for later use
      setRegistrationData(data);

      // Send OTP for phone verification
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          userData: {
            email: data.email,
            name: data.name,
            role: data.role,
            facilityName: data.facilityName,
            location: data.location,
            phoneNumber: data.phoneNumber
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOtpId(result.otpId);
        setShowOTPVerification(true);
      } else {
        setError(result.message || 'Failed to send verification code');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerificationSuccess = async (userData: any) => {
    if (!registrationData) {
      setError('Registration data not found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Complete user registration with Firebase
      await registerUser(
        registrationData.email,
        registrationData.password,
        registrationData.role,
        registrationData.name,
        registrationData.facilityName,
        registrationData.location,
        registrationData.phoneNumber
      );

      router.push('/');
    } catch (err: unknown) {
      console.error('Registration completion error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete registration. Please try again.';
      setError(errorMessage);
      setShowOTPVerification(false); // Go back to form
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setOtpId(null);
    setRegistrationData(null);
  };
  
  // Show OTP verification if needed
  if (showOTPVerification && otpId && registrationData) {
    return (
      <OTPVerification
        otpId={otpId}
        phoneNumber={registrationData.phoneNumber || ''}
        onVerificationSuccess={handleOTPVerificationSuccess}
        onCancel={handleOTPCancel}
      />
    );
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
            Full Name
          </label>
          <div className="mt-2">
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name', { required: 'Name is required' })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
            Email address
          </label>
          <div className="mt-2">
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Please enter a valid email',
                }
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
            Password
          </label>
          <div className="mt-2">
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters long',
                }
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-900">
            Confirm Password
          </label>
          <div className="mt-2">
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900">
            I am a
          </label>
          <div className="mt-2">
            <select
              id="role"
              {...register('role', { required: 'Please select a role' })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            >
              <option value="">Select your role</option>
              <option value="hospital">Hospital/Clinic</option>
              <option value="supplier">Supplier</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="facilityName" className="block text-sm font-medium leading-6 text-gray-900">
            Facility/Organization Name
          </label>
          <div className="mt-2">
            <input
              id="facilityName"
              type="text"
              placeholder="e.g. Central Hospital, ABC Medical Supplies"
              {...register('facilityName', { required: 'Facility name is required' })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.facilityName && (
              <p className="mt-1 text-sm text-red-600">{errors.facilityName.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900">
            Location (Optional)
          </label>
          <div className="mt-2">
            <input
              id="location"
              type="text"
              {...register('location')}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium leading-6 text-gray-900">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="mt-2">
            <input
              id="phoneNumber"
              type="tel"
              placeholder="e.g. +254712345678 or 0712345678"
              {...register('phoneNumber', {
                required: 'Phone number is required for verification',
                pattern: {
                  value: /^(\+254|0)[17]\d{8}$/,
                  message: 'Please enter a valid Kenyan phone number',
                }
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex w-full justify-center rounded-md px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600 trust-primary'
            }`}
          >
            {isLoading ? 'Sending verification code...' : 'Send verification code'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold leading-6 text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
