import { NextRequest, NextResponse } from 'next/server';
import { handleUssdSession } from '@/app/lib/ussdService';

// Enhanced USSD API endpoint for Africa's Talking integration
// Handles USSD requests from telecom providers (Safaricom, Airtel, Orange)
// Service Code: *789*12345#

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and form-encoded data
    const contentType = request.headers.get('content-type') || '';
    let sessionId: string | null = null;
    let serviceCode: string | null = null;
    let phoneNumber: string | null = null;
    let text: string | null = null;
    let networkCode: string | null = null;

    if (contentType.includes('application/json')) {
      // JSON format (for testing or custom integrations)
      const data = await request.json();
      ({ sessionId, serviceCode, phoneNumber, text, networkCode } = data);
    } else {
      // Form-encoded format (Africa's Talking standard)
      const body = await request.text();
      const params = new URLSearchParams(body);
      sessionId = params.get('sessionId');
      serviceCode = params.get('serviceCode');
      phoneNumber = params.get('phoneNumber');
      text = params.get('text') || '';
      networkCode = params.get('networkCode');
    }

    // Validate required parameters
    if (!sessionId || !serviceCode || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, serviceCode, phoneNumber' },
        { status: 400 }
      );
    }

    // Determine provider based on network code
    let provider: 'safaricom' | 'airtel' | 'orange' = 'safaricom';
    if (networkCode) {
      switch (networkCode) {
        case '63902': // Safaricom
        case '63903': // Safaricom
          provider = 'safaricom';
          break;
        case '63907': // Airtel
          provider = 'airtel';
          break;
        case '63905': // Orange (Telkom)
          provider = 'orange';
          break;
        default:
          provider = 'safaricom'; // Default fallback
      }
    }

    // Clean and format phone number
    let cleanPhoneNumber = phoneNumber;
    if (phoneNumber.startsWith('+254')) {
      cleanPhoneNumber = phoneNumber;
    } else if (phoneNumber.startsWith('254')) {
      cleanPhoneNumber = `+${phoneNumber}`;
    } else if (phoneNumber.startsWith('0')) {
      cleanPhoneNumber = `+254${phoneNumber.slice(1)}`;
    } else {
      cleanPhoneNumber = `+254${phoneNumber}`;
    }

    // Extract user input from text
    let userInput = '';
    if (text && text.trim()) {
      const parts = text.split('*');
      userInput = parts[parts.length - 1] || '';
    }

    console.log(`USSD Request: ${cleanPhoneNumber} -> ${serviceCode} -> "${userInput}" (${provider})`);

    // Handle USSD session with enhanced functionality
    const result = await handleUssdSession(
      sessionId,
      cleanPhoneNumber,
      userInput,
      serviceCode,
      provider
    );

    // Format response based on content type
    if (contentType.includes('application/json')) {
      // JSON response for testing
      return NextResponse.json({
        sessionId,
        phoneNumber: cleanPhoneNumber,
        text,
        userInput,
        provider,
        result
      });
    } else {
      // Plain text response for Africa's Talking
      let response = result.response;

      if (result.endSession) {
        response = `END ${response}`;
      } else {
        response = `CON ${response}`;
      }

      return new NextResponse(response, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

  } catch (error) {
    console.error('USSD API Error:', error);

    // Return appropriate error response
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Service error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } else {
      return new NextResponse('END Service temporarily unavailable. Please try again later.', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  }
}

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sessionId = searchParams.get('sessionId') || `test-${Date.now()}`;
  const serviceCode = searchParams.get('serviceCode') || '*789*12345#';
  const phoneNumber = searchParams.get('phoneNumber') || '+254700000000';
  const text = searchParams.get('text') || '';
  const provider = (searchParams.get('provider') as 'safaricom' | 'airtel' | 'orange') || 'safaricom';

  try {
    let userInput = '';
    if (text && text.trim()) {
      const parts = text.split('*');
      userInput = parts[parts.length - 1] || '';
    }

    const result = await handleUssdSession(
      sessionId,
      phoneNumber,
      userInput,
      serviceCode,
      provider
    );

    return NextResponse.json({
      sessionId,
      phoneNumber,
      text,
      userInput,
      provider,
      result,
      testUrl: `${request.nextUrl.origin}/api/ussd?sessionId=${sessionId}&phoneNumber=${phoneNumber}&text=${encodeURIComponent(text)}&provider=${provider}`
    });

  } catch (error) {
    console.error('USSD Test Error:', error);
    return NextResponse.json(
      { error: 'Service error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
