import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ussd/route'

// Mock the USSD service
jest.mock('@/app/lib/ussdService', () => ({
  handleUssdSession: jest.fn(),
}))

describe('/api/ussd', () => {
  const mockHandleUssdSession = require('@/app/lib/ussdService').handleUssdSession

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST endpoint', () => {
    it('should handle form-encoded USSD request successfully', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Welcome to StockAlert\n1. Report Low Stock\n2. Register\n3. Help\n0. Exit',
        endSession: false,
        nextLevel: 2
      })

      const formData = new URLSearchParams({
        sessionId: 'test-session-123',
        serviceCode: '*789*12345#',
        phoneNumber: '+254700000000',
        text: '',
        networkCode: '63902'
      })

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const response = await POST(request)
      const responseText = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/plain')
      expect(responseText).toBe('CON Welcome to StockAlert\n1. Report Low Stock\n2. Register\n3. Help\n0. Exit')
      expect(mockHandleUssdSession).toHaveBeenCalledWith(
        'test-session-123',
        '+254700000000',
        '',
        '*789*12345#',
        'safaricom'
      )
    })

    it('should handle JSON USSD request successfully', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Thank you for using StockAlert. Stay healthy!',
        endSession: true
      })

      const requestBody = {
        sessionId: 'test-session-123',
        serviceCode: '*789*12345#',
        phoneNumber: '+254700000000',
        text: '0',
        networkCode: '63907'
      }

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toMatchObject({
        sessionId: 'test-session-123',
        phoneNumber: '+254700000000',
        text: '0',
        userInput: '0',
        provider: 'airtel',
        result: {
          response: 'Thank you for using StockAlert. Stay healthy!',
          endSession: true
        }
      })
    })

    it('should handle phone number formatting correctly', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Welcome message',
        endSession: false
      })

      const testCases = [
        { input: '0700000000', expected: '+254700000000' },
        { input: '254700000000', expected: '+254700000000' },
        { input: '+254700000000', expected: '+254700000000' },
        { input: '700000000', expected: '+254700000000' }
      ]

      for (const testCase of testCases) {
        const formData = new URLSearchParams({
          sessionId: 'test-session',
          serviceCode: '*789*12345#',
          phoneNumber: testCase.input,
          text: ''
        })

        const request = new NextRequest('http://localhost:3000/api/ussd', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })

        await POST(request)

        expect(mockHandleUssdSession).toHaveBeenCalledWith(
          'test-session',
          testCase.expected,
          '',
          '*789*12345#',
          'safaricom'
        )
      }
    })

    it('should detect network provider correctly', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Welcome message',
        endSession: false
      })

      const networkTests = [
        { networkCode: '63902', expectedProvider: 'safaricom' },
        { networkCode: '63903', expectedProvider: 'safaricom' },
        { networkCode: '63907', expectedProvider: 'airtel' },
        { networkCode: '63905', expectedProvider: 'orange' },
        { networkCode: '99999', expectedProvider: 'safaricom' }, // Default fallback
      ]

      for (const test of networkTests) {
        const formData = new URLSearchParams({
          sessionId: 'test-session',
          serviceCode: '*789*12345#',
          phoneNumber: '+254700000000',
          text: '',
          networkCode: test.networkCode
        })

        const request = new NextRequest('http://localhost:3000/api/ussd', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })

        await POST(request)

        expect(mockHandleUssdSession).toHaveBeenCalledWith(
          'test-session',
          '+254700000000',
          '',
          '*789*12345#',
          test.expectedProvider
        )
      }
    })

    it('should return error for missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'sessionId=test-session', // Missing serviceCode and phoneNumber
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing required parameters: sessionId, serviceCode, phoneNumber')
    })

    it('should handle service errors gracefully', async () => {
      mockHandleUssdSession.mockRejectedValue(new Error('Service error'))

      const formData = new URLSearchParams({
        sessionId: 'test-session',
        serviceCode: '*789*12345#',
        phoneNumber: '+254700000000',
        text: ''
      })

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const response = await POST(request)
      const responseText = await response.text()

      expect(response.status).toBe(200)
      expect(responseText).toBe('END Service temporarily unavailable. Please try again later.')
    })

    it('should format END response correctly', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Session complete',
        endSession: true
      })

      const formData = new URLSearchParams({
        sessionId: 'test-session',
        serviceCode: '*789*12345#',
        phoneNumber: '+254700000000',
        text: '0'
      })

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const response = await POST(request)
      const responseText = await response.text()

      expect(responseText).toBe('END Session complete')
    })

    it('should format CON response correctly', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Continue session',
        endSession: false
      })

      const formData = new URLSearchParams({
        sessionId: 'test-session',
        serviceCode: '*789*12345#',
        phoneNumber: '+254700000000',
        text: '1'
      })

      const request = new NextRequest('http://localhost:3000/api/ussd', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const response = await POST(request)
      const responseText = await response.text()

      expect(responseText).toBe('CON Continue session')
    })
  })

  describe('GET endpoint (testing)', () => {
    it('should handle GET request for testing', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Test response',
        endSession: false
      })

      const url = new URL('http://localhost:3000/api/ussd')
      url.searchParams.set('sessionId', 'test-session')
      url.searchParams.set('phoneNumber', '+254700000000')
      url.searchParams.set('text', '1')
      url.searchParams.set('provider', 'airtel')

      const request = new NextRequest(url)
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toMatchObject({
        sessionId: 'test-session',
        phoneNumber: '+254700000000',
        text: '1',
        userInput: '1',
        provider: 'airtel',
        result: {
          response: 'Test response',
          endSession: false
        }
      })
      expect(responseData.testUrl).toContain('/api/ussd?')
    })

    it('should use default values for missing GET parameters', async () => {
      mockHandleUssdSession.mockResolvedValue({
        response: 'Default response',
        endSession: false
      })

      const request = new NextRequest('http://localhost:3000/api/ussd')
      const response = await GET(request)
      const responseData = await response.json()

      expect(responseData.phoneNumber).toBe('+254700000000')
      expect(responseData.provider).toBe('safaricom')
      expect(responseData.text).toBe('')
    })
  })
})
