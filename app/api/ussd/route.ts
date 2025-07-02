import { NextResponse } from 'next/server';
import { processUssdAlert, handleUssdSession } from '@/app/lib/ussdService';

// This route handles USSD requests from the telecom provider
// Typically, the telecom will send parameters like:
// - sessionId: A unique ID for the USSD session
// - phoneNumber: The phone number making the request
// - text: The user input (or empty for initial requests)
// - serviceCode: The USSD code that was dialed

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { sessionId, phoneNumber, text, serviceCode } = data;
    
    // Validate required parameters
    if (!sessionId || !phoneNumber || text === undefined || !serviceCode) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Store the current level in a real app, this would be stored in a database or cache
    // The level helps track where in the USSD menu flow the user is
    let currentLevel = 1;
    
    // If text is not empty, it means the user has navigated through the menu
    if (text) {
      const parts = text.split('*');
      currentLevel = parts.length + 1;
      const userInput = parts[parts.length - 1];
      
      // Process the USSD request based on the current level
      const response = handleUssdSession(sessionId, phoneNumber, userInput, currentLevel - 1);
      
      // Check if this is the final submission that needs processing
      if (response.endSession && currentLevel >= 5) {
        // In a real app, we would extract the actual values from the previous inputs
        // and store them in a database
        const mockHospitalId = 'hospital_123';
        const mockHospitalName = 'Central Hospital';
        const mockDrugId = 'drug_456';
        const mockDrugName = 'Paracetamol';
        const mockQuantity = 10;
        const mockUrgencyLevel = 'high';
        
        // Process the alert in the background
        processUssdAlert(
          sessionId,
          phoneNumber,
          mockHospitalId,
          mockHospitalName,
          mockDrugId,
          mockDrugName,
          mockQuantity,
          mockUrgencyLevel as any,
          { address: 'Nairobi, Kenya' }
        ).catch(error => {
          console.error('Background processing failed:', error);
        });
      }
      
      // Return response to the USSD gateway
      return NextResponse.json({
        response: response.response,
        endSession: response.endSession
      });
    } else {
      // Initial request, show the main menu
      const response = handleUssdSession(sessionId, phoneNumber, '', 1);
      return NextResponse.json({
        response: response.response,
        endSession: response.endSession
      });
    }
  } catch (error) {
    console.error('USSD processing error:', error);
    return NextResponse.json({
      response: 'Service temporarily unavailable. Please try again later.',
      endSession: true
    }, { status: 500 });
  }
}
