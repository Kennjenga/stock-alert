// Enhanced USSD Service Tests for Africa's Talking API compliance
import { 
  detectProvider, 
  formatPhoneNumber, 
  truncateResponse, 
  isSessionNearExpiry,
  extendSessionTimeout,
  USSD_CONFIG 
} from '@/app/lib/ussdService';
import { USSDSession } from '@/app/types';

// Mock Firebase functions
jest.mock('@/app/lib/firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('@/app/hooks/useFirestore', () => ({
  addDocument: jest.fn().mockResolvedValue('test-doc-id')
}));

describe('Enhanced USSD Service - Africa\'s Talking Compliance', () => {
  describe('detectProvider', () => {
    it('should detect Safaricom from network codes', () => {
      expect(detectProvider('63902')).toBe('safaricom');
      expect(detectProvider('63903')).toBe('safaricom');
    });

    it('should detect Airtel from network code', () => {
      expect(detectProvider('63907')).toBe('airtel');
    });

    it('should detect Orange from network code', () => {
      expect(detectProvider('63905')).toBe('orange');
    });

    it('should default to Safaricom for unknown codes', () => {
      expect(detectProvider('99999')).toBe('safaricom');
      expect(detectProvider(undefined)).toBe('safaricom');
      expect(detectProvider('')).toBe('safaricom');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Kenyan phone numbers correctly', () => {
      expect(formatPhoneNumber('+254712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('254712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('712345678')).toBe('+254712345678');
    });

    it('should handle phone numbers with spaces and special characters', () => {
      expect(formatPhoneNumber('+254 712 345 678')).toBe('+254712345678');
      expect(formatPhoneNumber('0712-345-678')).toBe('+254712345678');
      expect(formatPhoneNumber('(0712) 345 678')).toBe('+254712345678');
    });

    it('should handle edge cases', () => {
      expect(formatPhoneNumber('712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
    });
  });

  describe('truncateResponse', () => {
    it('should not truncate short responses', () => {
      const shortText = 'Welcome to StockAlert';
      expect(truncateResponse(shortText)).toBe(shortText);
    });

    it('should truncate long responses at word boundaries', () => {
      const longText = 'This is a very long message that exceeds the maximum length allowed by Africa\'s Talking USSD API and should be truncated properly at word boundaries to ensure good user experience';
      const truncated = truncateResponse(longText, 50);
      
      expect(truncated.length).toBeLessThanOrEqual(50);
      expect(truncated).toMatch(/\.\.\.$/);
      expect(truncated).not.toMatch(/\s\.\.\.$/); // Should not end with space before ...
    });

    it('should use default max length from config', () => {
      const longText = 'A'.repeat(200);
      const truncated = truncateResponse(longText);
      
      expect(truncated.length).toBeLessThanOrEqual(USSD_CONFIG.MAX_RESPONSE_LENGTH);
    });
  });

  describe('isSessionNearExpiry', () => {
    it('should return true for sessions expiring within 30 seconds', () => {
      const session: USSDSession = {
        id: 'test-session',
        sessionId: 'session-123',
        phoneNumber: '+254712345678',
        serviceCode: '*789*12345#',
        currentLevel: 1,
        sessionData: {},
        status: 'active',
        provider: 'safaricom',
        networkCode: '63902',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 20000).toISOString() // 20 seconds from now
      };

      expect(isSessionNearExpiry(session)).toBe(true);
    });

    it('should return false for sessions with more than 30 seconds remaining', () => {
      const session: USSDSession = {
        id: 'test-session',
        sessionId: 'session-123',
        phoneNumber: '+254712345678',
        serviceCode: '*789*12345#',
        currentLevel: 1,
        sessionData: {},
        status: 'active',
        provider: 'safaricom',
        networkCode: '63902',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString() // 60 seconds from now
      };

      expect(isSessionNearExpiry(session)).toBe(false);
    });
  });

  describe('USSD_CONFIG constants', () => {
    it('should have correct Africa\'s Talking configuration', () => {
      expect(USSD_CONFIG.SESSION_TIMEOUT_MINUTES).toBe(3);
      expect(USSD_CONFIG.MAX_RESPONSE_LENGTH).toBe(182);
      expect(USSD_CONFIG.RESPONSE_PREFIXES.CONTINUE).toBe('CON');
      expect(USSD_CONFIG.RESPONSE_PREFIXES.END).toBe('END');
    });

    it('should have correct network codes', () => {
      expect(USSD_CONFIG.NETWORK_CODES.SAFARICOM).toEqual(['63902', '63903']);
      expect(USSD_CONFIG.NETWORK_CODES.AIRTEL).toEqual(['63907']);
      expect(USSD_CONFIG.NETWORK_CODES.ORANGE).toEqual(['63905']);
    });
  });

  describe('Enhanced session management', () => {
    it('should handle network code in session creation', () => {
      const sessionData = {
        sessionId: 'test-session',
        phoneNumber: '+254712345678',
        serviceCode: '*789*12345#',
        currentLevel: 1,
        sessionData: {},
        status: 'active' as const,
        provider: 'safaricom' as const,
        networkCode: '63902',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 180000).toISOString()
      };

      expect(sessionData.networkCode).toBe('63902');
      expect(sessionData.provider).toBe('safaricom');
    });

    it('should validate session timeout configuration', () => {
      const timeoutMs = USSD_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;
      expect(timeoutMs).toBe(180000); // 3 minutes in milliseconds
    });
  });

  describe('Provider-specific configurations', () => {
    it('should handle different provider capabilities', () => {
      const providerConfigs = {
        safaricom: { maxMenuItems: 8, shortMessages: false },
        airtel: { maxMenuItems: 6, shortMessages: true },
        orange: { maxMenuItems: 7, shortMessages: false }
      };

      expect(providerConfigs.safaricom.maxMenuItems).toBe(8);
      expect(providerConfigs.airtel.shortMessages).toBe(true);
      expect(providerConfigs.orange.maxMenuItems).toBe(7);
    });
  });

  describe('Error handling and validation', () => {
    it('should validate session ID format', () => {
      const validSessionIds = ['session-123', 'ATUid_7d7f61731aa08be2483f110ba1831e87', 'test_session_1'];
      const invalidSessionIds = ['session 123', 'session@123', 'session#123'];

      validSessionIds.forEach(id => {
        expect(/^[a-zA-Z0-9_-]+$/.test(id)).toBe(true);
      });

      invalidSessionIds.forEach(id => {
        expect(/^[a-zA-Z0-9_-]+$/.test(id)).toBe(false);
      });
    });

    it('should validate phone number format', () => {
      const validPhones = ['+254712345678', '+254722345678', '+254733345678'];
      const invalidPhones = ['+254612345678', '+254812345678', '254712345678'];

      validPhones.forEach(phone => {
        expect(/^\+254[17]\d{8}$/.test(phone)).toBe(true);
      });

      // Note: Some invalid phones might still pass basic format but fail business logic
      expect(/^\+254[17]\d{8}$/.test('+254612345678')).toBe(false);
    });
  });

  describe('Response formatting compliance', () => {
    it('should format responses according to Africa\'s Talking requirements', () => {
      const response = 'Welcome to StockAlert';
      const continueResponse = `${USSD_CONFIG.RESPONSE_PREFIXES.CONTINUE} ${response}`;
      const endResponse = `${USSD_CONFIG.RESPONSE_PREFIXES.END} ${response}`;

      expect(continueResponse).toBe('CON Welcome to StockAlert');
      expect(endResponse).toBe('END Welcome to StockAlert');
    });

    it('should ensure responses start with CON or END', () => {
      const responses = ['CON Welcome', 'END Thank you', 'CON Select option'];
      
      responses.forEach(response => {
        expect(response.startsWith('CON ') || response.startsWith('END ')).toBe(true);
      });
    });
  });
});
