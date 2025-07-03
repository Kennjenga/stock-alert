import {
  createUSSDSession,
  updateUSSDSession,
  getUSSDSession,
  isSessionExpired,
  getUserByPhone,
  handleUssdSession,
  processUssdAlert
} from '@/app/lib/ussdService'
import { USSDSession, UserData } from '@/app/types'

// Mock Firebase functions
jest.mock('@/app/hooks/useFirestore', () => ({
  addDocument: jest.fn().mockResolvedValue('test-doc-id'),
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}))

jest.mock('@/app/lib/firebase', () => ({
  db: {},
}))

// Mock other services
jest.mock('@/app/lib/supplierFilteringService', () => ({
  distributeAlertToSuppliers: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/app/lib/airtimeService', () => ({
  rewardUserWithAirtime: jest.fn().mockResolvedValue(true),
}))

describe('USSD Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createUSSDSession', () => {
    it('should create a new USSD session with correct properties', async () => {
      const sessionId = 'test-session-123'
      const phoneNumber = '+254700000000'
      const serviceCode = '*789*12345#'
      const provider = 'safaricom'

      const session = await createUSSDSession(sessionId, phoneNumber, serviceCode, provider)

      expect(session).toMatchObject({
        id: 'test-doc-id',
        sessionId,
        phoneNumber,
        serviceCode,
        currentLevel: 1,
        sessionData: {},
        status: 'active',
        provider,
      })
      expect(session.startedAt).toBeDefined()
      expect(session.lastActivityAt).toBeDefined()
      expect(session.expiresAt).toBeDefined()
    })

    it('should set expiration time to 5 minutes from creation', async () => {
      const session = await createUSSDSession('test', '+254700000000', '*789*12345#', 'safaricom')
      
      const startTime = new Date(session.startedAt).getTime()
      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = startTime + (5 * 60 * 1000) // 5 minutes

      expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('isSessionExpired', () => {
    it('should return false for non-expired session', () => {
      const session: USSDSession = {
        ...global.mockUSSDSession,
        expiresAt: new Date(Date.now() + 60000).toISOString() // 1 minute from now
      }

      expect(isSessionExpired(session)).toBe(false)
    })

    it('should return true for expired session', () => {
      const session: USSDSession = {
        ...global.mockUSSDSession,
        expiresAt: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      }

      expect(isSessionExpired(session)).toBe(true)
    })
  })

  describe('handleUssdSession', () => {
    const mockGetUSSDSession = jest.fn()
    const mockCreateUSSDSession = jest.fn()
    const mockUpdateUSSDSession = jest.fn()
    const mockGetUserByPhone = jest.fn()

    beforeEach(() => {
      // Mock the functions that are imported
      require('@/app/lib/ussdService').getUSSDSession = mockGetUSSDSession
      require('@/app/lib/ussdService').createUSSDSession = mockCreateUSSDSession
      require('@/app/lib/ussdService').updateUSSDSession = mockUpdateUSSDSession
      require('@/app/lib/ussdService').getUserByPhone = mockGetUserByPhone
    })

    it('should create new session if none exists', async () => {
      mockGetUSSDSession.mockResolvedValue(null)
      mockCreateUSSDSession.mockResolvedValue(global.mockUSSDSession)
      mockGetUserByPhone.mockResolvedValue(null)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      const result = await handleUssdSession(
        'test-session',
        '+254700000000',
        '',
        '*789*12345#',
        'safaricom'
      )

      expect(mockCreateUSSDSession).toHaveBeenCalledWith(
        'test-session',
        '+254700000000',
        '*789*12345#',
        'safaricom'
      )
      expect(result.response).toContain('Welcome to StockAlert')
      expect(result.endSession).toBe(false)
    })

    it('should handle expired session', async () => {
      const expiredSession = {
        ...global.mockUSSDSession,
        expiresAt: new Date(Date.now() - 60000).toISOString()
      }
      mockGetUSSDSession.mockResolvedValue(expiredSession)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      const result = await handleUssdSession(
        'test-session',
        '+254700000000',
        '',
        '*789*12345#',
        'safaricom'
      )

      expect(result.response).toContain('Session expired')
      expect(result.endSession).toBe(true)
      expect(mockUpdateUSSDSession).toHaveBeenCalledWith('test-session', { status: 'expired' })
    })

    it('should show different welcome message for registered vs unregistered users', async () => {
      mockGetUSSDSession.mockResolvedValue(global.mockUSSDSession)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      // Test with registered user
      mockGetUserByPhone.mockResolvedValue(global.mockUserData)
      const resultRegistered = await handleUssdSession(
        'test-session',
        '+254700000000',
        '',
        '*789*12345#',
        'safaricom'
      )

      expect(resultRegistered.response).toContain('Welcome Test Hospital')
      expect(resultRegistered.response).toContain('2. Check My Alerts')

      // Test with unregistered user
      mockGetUserByPhone.mockResolvedValue(null)
      const resultUnregistered = await handleUssdSession(
        'test-session',
        '+254700000000',
        '',
        '*789*12345#',
        'safaricom'
      )

      expect(resultUnregistered.response).toContain('Welcome to StockAlert')
      expect(resultUnregistered.response).toContain('2. Register')
    })
  })

  describe('processUssdAlert', () => {
    it('should successfully process a USSD alert', async () => {
      const { addDocument } = require('@/app/hooks/useFirestore')
      const { distributeAlertToSuppliers } = require('@/app/lib/supplierFilteringService')
      const { rewardUserWithAirtime } = require('@/app/lib/airtimeService')

      addDocument.mockResolvedValue('test-alert-id')
      distributeAlertToSuppliers.mockResolvedValue(true)
      rewardUserWithAirtime.mockResolvedValue(true)

      const result = await processUssdAlert(
        'test-session',
        '+254700000000',
        'test-hospital-id',
        'Test Hospital',
        '1',
        'Paracetamol',
        50,
        'high',
        { address: 'Nairobi' }
      )

      expect(result).toBe(true)
      expect(addDocument).toHaveBeenCalledWith('stockAlerts', expect.objectContaining({
        hospitalId: 'test-hospital-id',
        hospitalName: 'Test Hospital',
        drugs: expect.arrayContaining([
          expect.objectContaining({
            drugId: '1',
            drugName: 'Paracetamol',
            requestedQuantity: 50,
            urgencyLevel: 'high'
          })
        ])
      }))
      expect(distributeAlertToSuppliers).toHaveBeenCalled()
      expect(rewardUserWithAirtime).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const { addDocument } = require('@/app/hooks/useFirestore')
      addDocument.mockRejectedValue(new Error('Database error'))

      const result = await processUssdAlert(
        'test-session',
        '+254700000000',
        'test-hospital-id',
        'Test Hospital',
        '1',
        'Paracetamol',
        50,
        'high'
      )

      expect(result).toBe(false)
    })
  })

  describe('USSD Menu Flow Integration', () => {
    const mockGetUSSDSession = jest.fn()
    const mockCreateUSSDSession = jest.fn()
    const mockUpdateUSSDSession = jest.fn()
    const mockGetUserByPhone = jest.fn()

    beforeEach(() => {
      require('@/app/lib/ussdService').getUSSDSession = mockGetUSSDSession
      require('@/app/lib/ussdService').createUSSDSession = mockCreateUSSDSession
      require('@/app/lib/ussdService').updateUSSDSession = mockUpdateUSSDSession
      require('@/app/lib/ussdService').getUserByPhone = mockGetUserByPhone
    })

    it('should handle complete stock reporting flow', async () => {
      const session = { ...global.mockUSSDSession }
      mockGetUSSDSession.mockResolvedValue(session)
      mockGetUserByPhone.mockResolvedValue(global.mockUserData)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      // Step 1: Main menu - select "Report Stock"
      session.currentLevel = 2
      const step1 = await handleUssdSession('test-session', '+254700000000', '1', '*789*12345#', 'safaricom')
      expect(step1.response).toContain('Select drug category')
      expect(step1.endSession).toBe(false)

      // Step 2: Select category (Analgesics)
      session.currentLevel = 3
      session.sessionData = { action: 'report', categories: ['Analgesics', 'Antibiotics'] }
      const step2 = await handleUssdSession('test-session', '+254700000000', '1', '*789*12345#', 'safaricom')
      expect(step2.response).toContain('Select drug from Analgesics')
      expect(step2.endSession).toBe(false)

      // Step 3: Select drug (Paracetamol)
      session.currentLevel = 4
      session.sessionData.categoryDrugs = [{ id: '1', name: 'Paracetamol', category: 'Analgesics' }]
      const step3 = await handleUssdSession('test-session', '+254700000000', '1', '*789*12345#', 'safaricom')
      expect(step3.response).toContain('Enter current quantity for Paracetamol')
      expect(step3.endSession).toBe(false)

      // Step 4: Enter quantity
      session.currentLevel = 5
      const step4 = await handleUssdSession('test-session', '+254700000000', '10', '*789*12345#', 'safaricom')
      expect(step4.response).toContain('Quantity: 10 units')
      expect(step4.response).toContain('Select urgency level')
      expect(step4.endSession).toBe(false)

      // Step 5: Select urgency and complete
      session.currentLevel = 6
      session.sessionData.quantity = 10
      session.sessionData.selectedDrug = { id: '1', name: 'Paracetamol' }

      // Mock successful alert processing
      const { addDocument } = require('@/app/hooks/useFirestore')
      addDocument.mockResolvedValue('test-alert-id')

      const step5 = await handleUssdSession('test-session', '+254700000000', '3', '*789*12345#', 'safaricom')
      expect(step5.response).toContain('Alert submitted successfully')
      expect(step5.response).toContain('Paracetamol')
      expect(step5.endSession).toBe(true)
    })

    it('should handle user registration flow', async () => {
      const session = { ...global.mockUSSDSession }
      mockGetUSSDSession.mockResolvedValue(session)
      mockGetUserByPhone.mockResolvedValue(null) // Unregistered user
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      // Step 1: Main menu - select "Register"
      session.currentLevel = 2
      const step1 = await handleUssdSession('test-session', '+254700000000', '2', '*789*12345#', 'safaricom')
      expect(step1.response).toContain('Enter your name')
      expect(step1.endSession).toBe(false)

      // Step 2: Enter name
      session.currentLevel = 10
      const step2 = await handleUssdSession('test-session', '+254700000000', 'John Doe', '*789*12345#', 'safaricom')
      expect(step2.response).toContain('Enter your hospital/facility name')
      expect(step2.endSession).toBe(false)

      // Step 3: Enter facility name
      session.currentLevel = 11
      session.sessionData = { name: 'John Doe' }
      const step3 = await handleUssdSession('test-session', '+254700000000', 'City Hospital', '*789*12345#', 'safaricom')
      expect(step3.response).toContain('Enter your location')
      expect(step3.endSession).toBe(false)

      // Step 4: Complete registration
      session.currentLevel = 12
      session.sessionData = { name: 'John Doe', facilityName: 'City Hospital' }

      const { addDocument } = require('@/app/hooks/useFirestore')
      addDocument.mockResolvedValue('new-user-id')

      const step4 = await handleUssdSession('test-session', '+254700000000', 'Nairobi', '*789*12345#', 'safaricom')
      expect(step4.response).toContain('Registration successful')
      expect(step4.response).toContain('Welcome John Doe')
      expect(step4.endSession).toBe(true)
    })

    it('should handle invalid inputs gracefully', async () => {
      const session = { ...global.mockUSSDSession }
      mockGetUSSDSession.mockResolvedValue(session)
      mockGetUserByPhone.mockResolvedValue(global.mockUserData)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      // Test invalid menu selection
      session.currentLevel = 2
      const invalidMenu = await handleUssdSession('test-session', '+254700000000', '9', '*789*12345#', 'safaricom')
      expect(invalidMenu.response).toContain('Invalid option')
      expect(invalidMenu.endSession).toBe(false)

      // Test invalid quantity input
      session.currentLevel = 5
      const invalidQuantity = await handleUssdSession('test-session', '+254700000000', 'abc', '*789*12345#', 'safaricom')
      expect(invalidQuantity.response).toContain('Please enter a valid number')
      expect(invalidQuantity.endSession).toBe(false)

      // Test negative quantity
      const negativeQuantity = await handleUssdSession('test-session', '+254700000000', '-5', '*789*12345#', 'safaricom')
      expect(negativeQuantity.response).toContain('Please enter a valid number')
      expect(negativeQuantity.endSession).toBe(false)
    })

    it('should handle back navigation', async () => {
      const session = { ...global.mockUSSDSession }
      mockGetUSSDSession.mockResolvedValue(session)
      mockGetUserByPhone.mockResolvedValue(global.mockUserData)
      mockUpdateUSSDSession.mockResolvedValue(undefined)

      // Test back from drug category selection
      session.currentLevel = 3
      session.sessionData = { categories: ['Analgesics', 'Antibiotics'] }
      const backFromCategory = await handleUssdSession('test-session', '+254700000000', '0', '*789*12345#', 'safaricom')
      expect(backFromCategory.response).toContain('Welcome back to StockAlert')
      expect(backFromCategory.endSession).toBe(false)

      // Test back from drug selection
      session.currentLevel = 4
      session.sessionData = {
        categories: ['Analgesics', 'Antibiotics'],
        categoryDrugs: [{ id: '1', name: 'Paracetamol' }]
      }
      const backFromDrug = await handleUssdSession('test-session', '+254700000000', '0', '*789*12345#', 'safaricom')
      expect(backFromDrug.response).toContain('Select drug category')
      expect(backFromDrug.endSession).toBe(false)
    })
  })
})
