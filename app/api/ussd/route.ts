import { NextRequest, NextResponse } from 'next/server';
import { handleUssdSession, detectProvider, formatPhoneNumber, USSD_CONFIG } from '@/app/lib/ussdService';

// Enhanced USSD API endpoint for Africa's Talking integration
// Complies with Africa's Talking USSD API specifications
// Handles USSD requests from telecom providers (Safaricom, Airtel, Orange)
// Service Code: *789*12345#

// Request rate limiting and validation
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout for Africa's Talking
const MAX_REQUEST_SIZE = 1024; // 1KB max request size

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Set timeout for the request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
    });

    const processRequest = async () => {
      // Validate content length
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
        throw new Error('Request too large');
      }

      // Handle both JSON and form-encoded data (Africa's Talking uses form-encoded)
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

      // Enhanced parameter validation
      if (!sessionId?.trim() || !serviceCode?.trim() || !phoneNumber?.trim()) {
        throw new Error('Missing required parameters: sessionId, serviceCode, phoneNumber');
      }

      // Validate session ID format (Africa's Talking format)
      if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        throw new Error('Invalid sessionId format');
      }

      return { sessionId, serviceCode, phoneNumber, text, networkCode, contentType };
    };

    const { sessionId, serviceCode, phoneNumber, text, networkCode, contentType } = await Promise.race([
      processRequest(),
      timeoutPromise
    ]) as { sessionId: string; serviceCode: string; phoneNumber: string; text: string; networkCode: string | null; contentType: string };

    // Enhanced provider detection using the utility function
    const provider = detectProvider(networkCode);

    // Format phone number using the utility function
    const cleanPhoneNumber = formatPhoneNumber(phoneNumber);

    // Validate phone number format
    if (!/^\+254[17]\d{8}$/.test(cleanPhoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Enhanced user input extraction and validation
    let userInput = '';
    if (text && text.trim()) {
      const parts = text.split('*');
      userInput = parts[parts.length - 1]?.trim() || '';

      // Validate input length (prevent abuse)
      if (userInput.length > 50) {
        userInput = userInput.substring(0, 50);
      }
    }

    // Log request for monitoring (without sensitive data)
    console.log(`USSD Request: ${cleanPhoneNumber.substring(0, 8)}*** -> ${serviceCode} -> "${userInput}" (${provider}) [${Date.now() - startTime}ms]`);

    // Handle USSD session with enhanced functionality
    const result = await handleUssdSession(
      sessionId,
      cleanPhoneNumber,
      userInput,
      serviceCode,
      provider,
      networkCode
    );

    // Enhanced response formatting based on content type
    if (contentType.includes('application/json')) {
      // JSON response for testing and debugging
      return NextResponse.json({
        sessionId,
        phoneNumber: cleanPhoneNumber,
        text,
        userInput,
        provider,
        networkCode,
        processingTime: Date.now() - startTime,
        result
      });
    } else {
      // Plain text response for Africa's Talking (strict format compliance)
      let response = result.response;

      // Ensure response doesn't exceed Africa's Talking limits
      if (response.length > USSD_CONFIG.MAX_RESPONSE_LENGTH) {
        response = response.substring(0, USSD_CONFIG.MAX_RESPONSE_LENGTH - 3) + '...';
      }

      // Format response according to Africa's Talking requirements
      const prefix = result.endSession ? USSD_CONFIG.RESPONSE_PREFIXES.END : USSD_CONFIG.RESPONSE_PREFIXES.CONTINUE;
      const formattedResponse = `${prefix} ${response}`;

      // Log response for monitoring
      console.log(`USSD Response: ${cleanPhoneNumber.substring(0, 8)}*** -> ${prefix} [${Date.now() - startTime}ms]`);

      return new NextResponse(formattedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('USSD API Error:', error, `[${processingTime}ms]`);

    // Enhanced error handling with proper logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON error response for testing
      return NextResponse.json(
        {
          error: 'Service error',
          details: errorMessage,
          processingTime,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    } else {
      // Africa's Talking compliant error response
      const errorResponse = errorMessage.includes('timeout')
        ? 'END Request timeout. Please try again.'
        : (errorMessage.includes('Invalid') || errorMessage.includes('Missing required parameters'))
        ? `END ${errorMessage}`
        : 'END Service temporarily unavailable. Please try again later.';

      return new NextResponse(errorResponse, {
        status: 200, // Always return 200 for Africa's Talking
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  }
}

// Enhanced GET method for testing with better validation
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  try {
    const sessionId = searchParams.get('sessionId') || `test-${Date.now()}`;
    const serviceCode = searchParams.get('serviceCode') || '*789*12345#';
    const phoneNumber = formatPhoneNumber(searchParams.get('phoneNumber') || '+254700000000');
    const text = searchParams.get('text') || '';
    const networkCode = searchParams.get('networkCode') || '63902'; // Default to Safaricom
    const provider = detectProvider(networkCode);

    // Validate test parameters
    if (!/^\+254[17]\d{8}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number format for testing');
    }

    let userInput = '';
    if (text && text.trim()) {
      const parts = text.split('*');
      userInput = parts[parts.length - 1]?.trim() || '';
    }

    console.log(`USSD Test Request: ${phoneNumber} -> ${serviceCode} -> "${userInput}" (${provider})`);

    const result = await handleUssdSession(
      sessionId,
      phoneNumber,
      userInput,
      serviceCode,
      provider,
      networkCode
    );

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      sessionId,
      phoneNumber,
      text,
      userInput,
      provider,
      networkCode,
      processingTime,
      result,
      testUrls: {
        current: `${request.nextUrl.origin}/api/ussd?sessionId=${sessionId}&phoneNumber=${encodeURIComponent(phoneNumber)}&text=${encodeURIComponent(text)}&provider=${provider}`,
        nextStep: `${request.nextUrl.origin}/api/ussd?sessionId=${sessionId}&phoneNumber=${encodeURIComponent(phoneNumber)}&text=${encodeURIComponent(text + '*1')}&provider=${provider}`
      },
      africasTalkingFormat: {
        request: {
          sessionId,
          serviceCode,
          phoneNumber,
          text,
          networkCode
        },
        response: result.endSession ? `END ${result.response}` : `CON ${result.response}`
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('USSD Test Error:', error);
    return NextResponse.json(
      {
        error: 'Service error',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
