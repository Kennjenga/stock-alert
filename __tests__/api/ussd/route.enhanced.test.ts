// Enhanced USSD API Route Tests for Africa's Talking compliance
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/ussd/route';

// Mock the USSD service
jest.mock('@/app/lib/ussdService', () => ({
  handleUssdSession: jest.fn(),
  detectProvider: jest.fn(),
  formatPhoneNumber: jest.fn(),
  USSD_CONFIG: {
    SESSION_TIMEOUT_MINUTES: 3,
    MAX_RESPONSE_LENGTH: 182,
    NETWORK_CODES: {
      SAFARICOM: ['63902', '63903'],
      AIRTEL: ['63907'],
      ORANGE: ['63905']
    },
    RESPONSE_PREFIXES: {
      CONTINUE: 'CON',
      END: 'END'
    }
  }
}));

const mockHandleUssdSession = require('@/app/lib/ussdService').handleUssdSession;
const mockDetectProvider = require('@/app/lib/ussdService').detectProvider;
const mockFormatPhoneNumber = require('@/app/lib/ussdService').formatPhoneNumber;

describe('Enhanced USSD API Route - Africa\'s Talking Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectProvider.mockReturnValue('safaricom');
    mockFormatPhoneNumber.mockImplementation((phone: string) => {
      if (phone.startsWith('+254')) return phone;
      if (phone.startsWith('254')) return `+${phone}`;
      if (phone.startsWith('0')) return `+254${phone.slice(1)}`;
      return `+254${phone}`;
    });
  });

  describe('POST method - Africa\'s Talking format', () => {
    it('should handle form-encoded request from Africa\'s Talking', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Welcome to StockAlert\n1. Report Low Stock\n2. Register\n3. Help\n0. Exit',
        endSession: false
      });

      const formData = new URLSearchParams({
        sessionId: 'ATUid_7d7f61731aa08be2483f110ba1831e87',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: '',
        networkCode: '63902'
      });

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(responseText).toMatch(/^CON /);
      expect(responseText).toContain('Welcome to StockAlert');
    });

    it('should handle session termination with END prefix', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Thank you for using StockAlert. Stay healthy!',
        endSession: true
      });

      const formData = new URLSearchParams({
        sessionId: 'ATUid_test_session',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: '*0',
        networkCode: '63902'
      });

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(responseText).toMatch(/^END /);
      expect(responseText).toContain('Thank you for using StockAlert');
    });

    it('should validate required parameters', async () => {
      const formData = new URLSearchParams({
        sessionId: '',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: ''
      });

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(responseText).toMatch(/^END /);
      expect(responseText).toContain('Missing required parameters');
    });

    it('should handle different network codes correctly', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Welcome message',
        endSession: false
      });

      const testCases = [
        { networkCode: '63902', expectedProvider: 'safaricom' },
        { networkCode: '63903', expectedProvider: 'safaricom' },
        { networkCode: '63907', expectedProvider: 'airtel' },
        { networkCode: '63905', expectedProvider: 'orange' }
      ];

      for (const testCase of testCases) {
        mockDetectProvider.mockReturnValue(testCase.expectedProvider);

        const formData = new URLSearchParams({
          sessionId: `test-${testCase.networkCode}`,
          serviceCode: '*789*12345#',
          phoneNumber: '+254712345678',
          text: '',
          networkCode: testCase.networkCode
        });

        const request = new NextRequest('http://localhost:3000/api/ussd', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        await POST(request);

        expect(mockDetectProvider).toHaveBeenCalledWith(testCase.networkCode);
        expect(mockHandleUssdSession).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          testCase.expectedProvider,
          testCase.networkCode
        );
      }
    });

    it('should handle JSON requests for testing', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Test response',
        endSession: false
      });

      const requestBody = {
        sessionId: 'test-session',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: '',
        networkCode: '63902'
      };

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('sessionId');
      expect(responseData).toHaveProperty('phoneNumber');
      expect(responseData).toHaveProperty('provider');
      expect(responseData).toHaveProperty('networkCode');
      expect(responseData).toHaveProperty('processingTime');
      expect(responseData).toHaveProperty('result');
    });

    it('should handle request timeout', async () => {
      mockHandleUssdSession.mockImplementation(() =>
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('Request timeout')), 11000)) // 11 seconds (longer than API timeout)
      );

      const formData = new URLSearchParams({
        sessionId: 'timeout-test',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: '',
        networkCode: '63902'
      });

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const response = await POST(request);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(responseText).toMatch(/^END /);
      expect(responseText).toContain('timeout');
    }, 15000); // 15 second test timeout

    it('should validate session ID format', async () => {
      const invalidSessionIds = ['session 123', 'session@123', 'session#123'];

      for (const sessionId of invalidSessionIds) {
        const formData = new URLSearchParams({
          sessionId,
          serviceCode: '*789*12345#',
          phoneNumber: '+254712345678',
          text: '',
          networkCode: '63902'
        });

        const request = new NextRequest('http://localhost:3000/api/ussd', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        const response = await POST(request);
        const responseText = await response.text();

        expect(response.status).toBe(200);
        expect(responseText).toMatch(/^END /);
        expect(responseText).toContain('Invalid');
      }
    });
  });

  describe('GET method - Testing interface', () => {
    it('should provide comprehensive test response', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Test welcome message',
        endSession: false
      });

      const request = new NextRequest('http://localhost:3000/api/ussd?sessionId=test&phoneNumber=%2B254712345678&text=&provider=safaricom');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('testUrls');
      expect(responseData).toHaveProperty('africasTalkingFormat');
      expect(responseData.africasTalkingFormat.response).toMatch(/^CON /);
    });

    it('should validate phone number format in test mode', async () => {
      const request = new NextRequest('http://localhost:3000/api/ussd?sessionId=test&phoneNumber=invalid&text=&provider=safaricom');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Service error');
      expect(responseData.details).toContain('Invalid phone number format');
    });
  });

  describe('Response formatting compliance', () => {
    it('should ensure all responses start with CON or END', async () => {
      const testResponses = [
        { response: 'Welcome', endSession: false, expected: /^CON / },
        { response: 'Goodbye', endSession: true, expected: /^END / }
      ];

      for (const testCase of testResponses) {
        mockHandleUssdSession.mockResolvedValue(testCase);

        const formData = new URLSearchParams({
          sessionId: 'format-test',
          serviceCode: '*789*12345#',
          phoneNumber: '+254712345678',
          text: '',
          networkCode: '63902'
        });

        const request = new NextRequest('http://localhost:3000/api/ussd', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        });

        const response = await POST(request);
        const responseText = await response.text();

        expect(responseText).toMatch(testCase.expected);
      }
    });

    it('should include proper headers for Africa\'s Talking', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Test response',
        endSession: false
      });

      const formData = new URLSearchParams({
        sessionId: 'header-test',
        serviceCode: '*789*12345#',
        phoneNumber: '+254712345678',
        text: '',
        networkCode: '63902'
      });

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });
});
