'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuide() {
  const { userData } = useAuth();
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Show onboarding guide for new users (you can add logic to check if it's their first login)
    const hasSeenGuide = localStorage.getItem('hasSeenOnboardingGuide');
    if (!hasSeenGuide && userData) {
      setShowGuide(true);
    }
  }, [userData]);

  const hospitalSteps = [
    {
      title: '🏥 Welcome to Stockz!',
      content: `Hi ${userData?.name?.split(' ')[0] || 'there'}! Welcome to your medical supply management dashboard. Let's get you started with managing ${userData?.facilityName || 'your facility'}'s inventory.`,
      action: { text: 'Get Started', href: null }
    },
    {
      title: '📊 Dashboard Overview',
      content: 'Your dashboard shows critical metrics: total alerts, pending alerts, and fulfillment status. Use the charts to track supply trends.',
      action: { text: 'Explore Dashboard', href: '/' }
    },
    {
      title: '🚨 Report Low Stock',
      content: 'When supplies run low, create an alert to notify suppliers. Click "Report Low Stock" to get started.',
      action: { text: 'Create Alert', href: '/hospital/alerts/new' }
    },
    {
      title: '📱 USSD Integration',
      content: 'You can also report low stock via your mobile phone using USSD. Dial *123*456# and get airtime rewards!',
      action: { text: 'View All Alerts', href: '/hospital/alerts' }
    },
    {
      title: '✅ You\'re All Set!',
      content: 'You now know the basics of Stockz. Need help? Contact support or explore the navigation menu.',
      action: { text: 'Start Using Stockz', href: null }
    }
  ];

  const supplierSteps = [
    {
      title: '🏢 Welcome to Stockz!',
      content: `Hi ${userData?.name?.split(' ')[0] || 'there'}! Welcome to your supplier dashboard. Manage supply requests from healthcare facilities efficiently.`,
      action: { text: 'Get Started', href: null }
    },
    {
      title: '📊 Dashboard Overview',
      content: 'Monitor supply requests, track fulfillment rates, and see which hospitals need your assistance most urgently.',
      action: { text: 'Explore Dashboard', href: '/' }
    },
    {
      title: '📋 View Requests',
      content: 'See all supply requests from hospitals. Respond quickly to critical alerts and manage your supply network.',
      action: { text: 'View Requests', href: '/supplier/alerts' }
    },
    {
      title: '🏥 Hospital Network',
      content: 'Build relationships with healthcare facilities in your area. The stronger your network, the better you can serve communities.',
      action: { text: 'View Hospitals', href: '/supplier/hospitals' }
    },
    {
      title: '✅ Ready to Help!',
      content: 'You\'re ready to make a difference in healthcare supply chains. Start responding to requests and save lives!',
      action: { text: 'Start Supplying', href: null }
    }
  ];

  const steps = userData?.role === 'hospital' ? hospitalSteps : supplierSteps;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenOnboardingGuide', 'true');
  };

  const skipGuide = () => {
    closeGuide();
  };

  if (!showGuide || !userData) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Quick Setup Guide
            </h3>
            <button
              onClick={skipGuide}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 trust-primary"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <h4 className="text-xl font-semibold text-gray-800 mb-3">
            {currentStepData.title}
          </h4>
          <p className="text-gray-600 leading-relaxed mb-6">
            {currentStepData.content}
          </p>
          
          {/* Action button for external links */}
          {currentStepData.action.href && (
            <Link
              href={currentStepData.action.href}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded-md transition-colors mb-4"
              onClick={closeGuide}
            >
              {currentStepData.action.text}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={skipGuide}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip Tour
              </button>
              
              {isLastStep ? (
                <button
                  onClick={closeGuide}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors trust-primary"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors trust-primary"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
