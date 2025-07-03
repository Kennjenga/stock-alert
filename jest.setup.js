import '@testing-library/jest-dom'

// Mock Firebase
jest.mock('./app/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock Africa's Talking
jest.mock('africastalking', () => {
  return jest.fn(() => ({
    SMS: {
      send: jest.fn().mockResolvedValue({
        SMSMessageData: {
          Recipients: [{
            messageId: 'test-message-id',
            status: 'Success',
            cost: 'KES 1.00'
          }]
        }
      })
    },
    AIRTIME: {
      send: jest.fn().mockResolvedValue({
        responses: [{
          phoneNumber: '+254700000000',
          amount: 'KES 10.00',
          status: 'Success',
          requestId: 'test-request-id'
        }]
      })
    }
  }))
})

// Mock environment variables
process.env.AFRICA_TALKING_API_KEY = 'test-api-key'
process.env.AFRICA_TALKING_USERNAME = 'test-username'
process.env.SMS_SENDER_ID = 'TEST'
process.env.USSD_SERVICE_CODE = '*789*12345#'

// Global test utilities
global.mockUSSDSession = {
  id: 'test-session-id',
  sessionId: 'test-session-123',
  phoneNumber: '+254700000000',
  serviceCode: '*789*12345#',
  currentLevel: 1,
  sessionData: {},
  status: 'active',
  provider: 'safaricom',
  startedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
}

global.mockUserData = {
  uid: 'test-user-id',
  email: 'test@example.com',
  role: 'hospital',
  name: 'Test Hospital',
  facilityName: 'Test Facility',
  location: 'Nairobi',
  phoneNumber: '+254700000000',
  createdAt: new Date().toISOString()
}

global.mockStockAlert = {
  id: 'test-alert-id',
  hospitalId: 'test-user-id',
  hospitalName: 'Test Hospital',
  facilityName: 'Test Facility',
  drugs: [{
    drugId: '1',
    drugName: 'Paracetamol',
    requestedQuantity: 100,
    urgencyLevel: 'high',
    unit: 'tablets',
    category: 'analgesics'
  }],
  overallUrgency: 'high',
  location: { address: 'Nairobi' },
  createdAt: new Date().toISOString(),
  status: 'pending'
}
