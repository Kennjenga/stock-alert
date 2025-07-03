// Enhanced USSD Service for Africa's Talking API integration
// Follows Africa's Talking best practices for session management, error handling, and response formatting
import { addDocument, queryDocuments, updateDocumentByQuery } from './firestore-server';
import { StockAlert, UrgencyLevel, USSDSession, UserData } from '../types';
import { distributeAlertToSuppliers } from './supplierFilteringService';
import { rewardUserWithAirtime } from './airtimeService';

// Africa's Talking USSD API constants
export const USSD_CONFIG = {
  SESSION_TIMEOUT_MINUTES: 3, // Reduced from 5 to 3 minutes for better UX
  MAX_RESPONSE_LENGTH: 182, // Africa's Talking USSD response limit
  NETWORK_CODES: {
    SAFARICOM: ['63902', '63903'],
    AIRTEL: ['63907'],
    ORANGE: ['63905']
  },
  RESPONSE_PREFIXES: {
    CONTINUE: 'CON',
    END: 'END'
  }
} as const;

// Enhanced provider detection based on network codes
export function detectProvider(networkCode?: string): 'safaricom' | 'airtel' | 'orange' {
  if (!networkCode) return 'safaricom'; // Default fallback

  if (USSD_CONFIG.NETWORK_CODES.SAFARICOM.includes(networkCode as '63902' | '63903')) return 'safaricom';
  if (USSD_CONFIG.NETWORK_CODES.AIRTEL.includes(networkCode as '63907')) return 'airtel';
  if (USSD_CONFIG.NETWORK_CODES.ORANGE.includes(networkCode as '63905')) return 'orange';

  return 'safaricom'; // Default fallback
}

// Validate and format phone number according to Kenya standards
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any whitespace and special characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+254')) {
    return cleaned;
  } else if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+254${cleaned.slice(1)}`;
  } else if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }

  // If format is unclear, assume it's a 9-digit number
  return `+254${cleaned}`;
}

// Truncate response to fit Africa's Talking limits
export function truncateResponse(text: string, maxLength: number = USSD_CONFIG.MAX_RESPONSE_LENGTH): string {
  if (text.length <= maxLength) return text;

  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

// Enhanced function to process USSD data from clinic staff
export async function processUssdAlert(
  sessionId: string,
  userPhone: string,
  hospitalId: string,
  hospitalName: string,
  drugId: string,
  drugName: string,
  quantity: number,
  urgencyLevel: UrgencyLevel,
  location?: { latitude?: number; longitude?: number; address?: string }
): Promise<boolean> {
  try {
    // 1. Create a stock alert in Firestore
    const alertData: Omit<StockAlert, 'id'> = {
      hospitalId,
      hospitalName,
      facilityName: hospitalName,
      drugs: [{
        drugId,
        drugName,
        requestedQuantity: quantity,
        urgencyLevel,
        unit: 'units',
        category: 'general'
      }],
      overallUrgency: urgencyLevel,
      location,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const alertId = await addDocument<Omit<StockAlert, 'id'>>('stockAlerts', alertData);

    // 2. Use the new filtering system to distribute alerts to eligible suppliers
    const alert: StockAlert = { id: alertId, ...alertData };
    await distributeAlertToSuppliers(alert);

    // 3. Reward the user with airtime
    await rewardUserWithAirtime(userPhone, hospitalId, alertId);

    // 4. Update session status
    await updateUSSDSession(sessionId, { status: 'completed', completedAt: new Date().toISOString() });

    return true;
  } catch (error) {
    console.error('Failed to process USSD alert:', error);
    await updateUSSDSession(sessionId, { status: 'cancelled' });
    return false;
  }
}

// Create or update USSD session with enhanced validation and timeout handling
export async function createUSSDSession(
  sessionId: string,
  phoneNumber: string,
  serviceCode: string,
  provider: 'safaricom' | 'airtel' | 'orange',
  networkCode?: string
): Promise<USSDSession> {
  // Validate inputs
  if (!sessionId || !phoneNumber || !serviceCode) {
    throw new Error('Missing required session parameters');
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  const timeoutMs = USSD_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

  const session: Omit<USSDSession, 'id'> = {
    sessionId,
    phoneNumber: formattedPhone,
    serviceCode,
    currentLevel: 1,
    sessionData: {} as Record<string, unknown>,
    status: 'active',
    provider,
    networkCode,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + timeoutMs).toISOString()
  };

  try {
    const sessionDocId = await addDocument<Omit<USSDSession, 'id'>>('ussdSessions', session);
    return { id: sessionDocId, ...session };
  } catch (error) {
    console.error('Failed to create USSD session:', error);
    throw new Error('Session creation failed');
  }
}

// Update USSD session
export async function updateUSSDSession(
  sessionId: string,
  updates: Partial<USSDSession>
): Promise<void> {
  try {
    await updateDocumentByQuery(
      'ussdSessions',
      'sessionId',
      sessionId,
      {
        ...updates,
        lastActivityAt: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('Failed to update USSD session:', error);
  }
}

// Get USSD session
export async function getUSSDSession(sessionId: string): Promise<USSDSession | null> {
  try {
    const sessions = await queryDocuments<USSDSession>('ussdSessions', 'sessionId', sessionId);
    return sessions.length > 0 ? sessions[0] : null;
  } catch (error) {
    console.error('Failed to get USSD session:', error);
    return null;
  }
}

// Enhanced session expiry check with grace period
export function isSessionExpired(session: USSDSession): boolean {
  const now = new Date();
  const expiryTime = new Date(session.expiresAt);
  return now > expiryTime;
}

// Check if session is about to expire (within 30 seconds)
export function isSessionNearExpiry(session: USSDSession): boolean {
  const now = new Date();
  const expiryTime = new Date(session.expiresAt);
  const gracePeriod = 30 * 1000; // 30 seconds
  return (expiryTime.getTime() - now.getTime()) <= gracePeriod;
}

// Extend session timeout for active users
export async function extendSessionTimeout(sessionId: string): Promise<void> {
  try {
    const timeoutMs = USSD_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;
    const newExpiryTime = new Date(Date.now() + timeoutMs).toISOString();

    await updateUSSDSession(sessionId, {
      expiresAt: newExpiryTime,
      lastActivityAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to extend session timeout:', error);
  }
}

// Get user by phone number
export async function getUserByPhone(phoneNumber: string): Promise<UserData | null> {
  try {
    const users = await queryDocuments<UserData>('users', 'phoneNumber', phoneNumber);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to get user by phone:', error);
    return null;
  }
}

// Enhanced USSD session handler with Africa's Talking best practices
export async function handleUssdSession(
  sessionId: string,
  phoneNumber: string,
  userInput: string,
  serviceCode: string,
  provider: 'safaricom' | 'airtel' | 'orange',
  networkCode?: string
): Promise<{ response: string; endSession: boolean; nextLevel?: number }> {
  try {
    // Validate inputs
    if (!sessionId || !phoneNumber || !serviceCode) {
      return {
        response: 'Invalid request parameters.',
        endSession: true
      };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Get or create session
    let session = await getUSSDSession(sessionId);

    if (!session) {
      session = await createUSSDSession(sessionId, formattedPhone, serviceCode, provider, networkCode);
    }

    // Check if session is expired
    if (isSessionExpired(session)) {
      await updateUSSDSession(sessionId, { status: 'expired' });
      return {
        response: truncateResponse(`Session expired. Please dial ${serviceCode} again.`),
        endSession: true
      };
    }

    // Warn if session is near expiry
    if (isSessionNearExpiry(session)) {
      await extendSessionTimeout(sessionId);
    }

    // Get user data with caching
    const user = await getUserByPhone(formattedPhone);

    // Handle different levels of the USSD flow
    const result = await processUSSDLevel(session, userInput, user, provider);

    // Update session with new data and activity timestamp
    const updateData: Partial<USSDSession> = {
      currentLevel: result.nextLevel || session.currentLevel,
      lastActivityAt: new Date().toISOString()
    };

    if (result.sessionData || session.sessionData) {
      updateData.sessionData = (result.sessionData || session.sessionData) as Record<string, unknown>;
    }

    await updateUSSDSession(sessionId, updateData);

    // Ensure response is properly formatted and within limits
    const formattedResponse = truncateResponse(result.response);

    return {
      ...result,
      response: formattedResponse
    };
  } catch (error) {
    console.error('Error handling USSD session:', error);

    // Log error details for debugging
    console.error('Session details:', { sessionId, phoneNumber, userInput, serviceCode, provider });

    return {
      response: truncateResponse('Service temporarily unavailable. Please try again later.'),
      endSession: true
    };
  }
}

// Enhanced USSD level processing with better error handling and validation
async function processUSSDLevel(
  session: USSDSession,
  userInput: string,
  user: UserData | null,
  provider: 'safaricom' | 'airtel' | 'orange'
): Promise<{ response: string; endSession: boolean; nextLevel?: number; sessionData?: unknown }> {
  const currentLevel = session.currentLevel;
  const sessionData = session.sessionData as Record<string, unknown>;

  // Sanitize user input
  const sanitizedInput = userInput?.trim() || '';

  // Enhanced drug list with more comprehensive data
  const drugs = [
    { id: '1', name: 'Paracetamol', category: 'Analgesics', commonName: 'Panadol' },
    { id: '2', name: 'Amoxicillin', category: 'Antibiotics', commonName: 'Amoxil' },
    { id: '3', name: 'Ibuprofen', category: 'Analgesics', commonName: 'Brufen' },
    { id: '4', name: 'Ciprofloxacin', category: 'Antibiotics', commonName: 'Cipro' },
    { id: '5', name: 'Insulin', category: 'Diabetes', commonName: 'Insulin' },
    { id: '6', name: 'Metformin', category: 'Diabetes', commonName: 'Glucophage' },
    { id: '7', name: 'Amlodipine', category: 'Hypertension', commonName: 'Norvasc' },
    { id: '8', name: 'Omeprazole', category: 'Gastric', commonName: 'Losec' }
  ];

  const urgencyLevels: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

  // Provider-specific customizations
  const providerConfig = {
    safaricom: { maxMenuItems: 8, shortMessages: false },
    airtel: { maxMenuItems: 6, shortMessages: true },
    orange: { maxMenuItems: 7, shortMessages: false }
  };

  const config = providerConfig[provider];

  switch (currentLevel) {
    case 1:
      // Enhanced welcome menu with provider-specific formatting
      const welcomeMessage = user
        ? config.shortMessages
          ? `Hi ${(user.name || 'User').split(' ')[0]}!\n1. Report Stock\n2. My Alerts\n3. Help\n0. Exit`
          : `Welcome ${user.name || 'User'} to StockAlert\n1. Report Low Stock\n2. Check My Alerts\n3. Help\n0. Exit`
        : config.shortMessages
          ? `StockAlert\n1. Report Stock\n2. Register\n3. Help\n0. Exit`
          : `Welcome to StockAlert\n1. Report Low Stock\n2. Register\n3. Help\n0. Exit`;

      return {
        response: welcomeMessage,
        endSession: false,
        nextLevel: 2
      };

    case 2:
      // Enhanced main menu selection with input validation
      switch (sanitizedInput) {
        case '1':
          if (!user) {
            return {
              response: config.shortMessages
                ? `Register first.\nEnter name:`
                : `Please register first.\nEnter your name:`,
              endSession: false,
              nextLevel: 10, // Registration flow
              sessionData: { ...sessionData, action: 'register' }
            };
          }
          // Show drug categories with provider-specific limits
          const categories = [...new Set(drugs.map(d => d.category))];
          const limitedCategories = categories.slice(0, config.maxMenuItems - 1); // Reserve space for "Back"
          const categoryList = limitedCategories.map((cat, index) => `${index + 1}. ${cat}`).join('\n');

          return {
            response: config.shortMessages
              ? `Drug category:\n${categoryList}\n0. Back`
              : `Select drug category:\n${categoryList}\n0. Back`,
            endSession: false,
            nextLevel: 3,
            sessionData: { ...sessionData, action: 'report', categories: limitedCategories }
          };

        case '2':
          if (!user) {
            return {
              response: config.shortMessages
                ? `Register first (option 2).`
                : `Please register first by selecting option 2 from main menu.`,
              endSession: true
            };
          }
          // Check user's alerts
          return await getUserAlerts(user.uid);

        case '3':
          return {
            response: config.shortMessages
              ? `Help:\n- Report stock\n- Get alerts\n- Earn airtime\nSupport: 0700123456`
              : `StockAlert Help:\n- Report low drug stock\n- Get real-time alerts\n- Earn airtime rewards\nFor support: Call 0700123456`,
            endSession: true
          };

        case '0':
          return {
            response: config.shortMessages
              ? `Thank you! Stay healthy!`
              : `Thank you for using StockAlert. Stay healthy!`,
            endSession: true
          };

        default:
          return {
            response: config.shortMessages
              ? `Invalid. Try again:\n1. Report\n2. Alerts\n3. Help\n0. Exit`
              : `Invalid option. Please try again.\n1. Report Low Stock\n2. Check Alerts\n3. Help\n0. Exit`,
            endSession: false,
            nextLevel: 2
          };
      }

    case 3:
      // Drug category selection
      const categories = (sessionData.categories as string[]) || [];
      const categoryIndex = parseInt(userInput) - 1;

      if (userInput === '0') {
        return {
          response: `Welcome back to StockAlert\n1. Report Low Stock\n2. Check My Alerts\n3. Help\n0. Exit`,
          endSession: false,
          nextLevel: 2
        };
      }

      if (categoryIndex >= 0 && categoryIndex < categories.length) {
        const selectedCategory = categories[categoryIndex];
        const categoryDrugs = drugs.filter(d => d.category === selectedCategory);
        const drugList = categoryDrugs.map((drug, index) => `${index + 1}. ${drug.name}`).join('\n');

        return {
          response: `Select drug from ${selectedCategory}:\n${drugList}\n0. Back`,
          endSession: false,
          nextLevel: 4,
          sessionData: {
            ...sessionData,
            selectedCategory,
            categoryDrugs
          }
        };
      } else {
        return {
          response: `Invalid selection. Please select a valid category number.`,
          endSession: false,
          nextLevel: 3
        };
      }

    case 4:
      // Drug selection
      const categoryDrugs = (sessionData.categoryDrugs as unknown[]) || [];

      if (userInput === '0') {
        const categories = (sessionData.categories as string[]) || [];
        const categoryList: string = categories.map((cat: string, index: number): string => `${index + 1}. ${cat}`).join('\n');
        return {
          response: `Select drug category:\n${categoryList}\n0. Back`,
          endSession: false,
          nextLevel: 3
        };
      }

      const drugIndex = parseInt(userInput) - 1;
      if (drugIndex >= 0 && drugIndex < categoryDrugs.length) {
        const selectedDrug = categoryDrugs[drugIndex] as { id: string; name: string; category: string };
        return {
          response: `Enter current quantity for ${selectedDrug.name} (number only):`,
          endSession: false,
          nextLevel: 5,
          sessionData: { ...sessionData, selectedDrug }
        };
      } else {
        return {
          response: `Invalid selection. Please select a valid drug number.`,
          endSession: false,
          nextLevel: 4
        };
      }

    case 5:
      // Quantity input
      const quantity = parseInt(userInput);
      if (isNaN(quantity) || quantity < 0) {
        return {
          response: `Please enter a valid number (0 or greater):`,
          endSession: false,
          nextLevel: 5
        };
      }

      const urgencyList = urgencyLevels.map((level, index) =>
        `${index + 1}. ${level.toUpperCase()}`
      ).join('\n');

      return {
        response: `Quantity: ${quantity} units\nSelect urgency level:\n${urgencyList}`,
        endSession: false,
        nextLevel: 6,
        sessionData: { ...sessionData, quantity }
      };

    case 6:
      // Urgency selection and final submission
      const urgencyIndex = parseInt(userInput) - 1;
      if (urgencyIndex >= 0 && urgencyIndex < urgencyLevels.length) {
        const selectedUrgency = urgencyLevels[urgencyIndex];

        // Process the alert
        const success = await processUssdAlert(
          session.sessionId,
          session.phoneNumber,
          user!.uid,
          user!.facilityName || user!.name || 'Unknown Hospital',
          (sessionData.selectedDrug as { id: string; name: string }).id,
          (sessionData.selectedDrug as { id: string; name: string }).name,
          parseInt(sessionData.quantity as string),
          selectedUrgency,
          { address: user!.location }
        );

        if (success) {
          return {
            response: `✅ Alert submitted successfully!\n\nDrug: ${(sessionData.selectedDrug as { name: string }).name}\nQuantity: ${sessionData.quantity}\nUrgency: ${selectedUrgency.toUpperCase()}\n\nSuppliers have been notified. You'll receive airtime as reward. Thank you!`,
            endSession: true
          };
        } else {
          return {
            response: `❌ Failed to submit alert. Please try again later or contact support.`,
            endSession: true
          };
        }
      } else {
        return {
          response: `Invalid selection. Please select a valid urgency level.`,
          endSession: false,
          nextLevel: 6
        };
      }

    // Registration flow (levels 10-13)
    case 10:
      // Name input
      if (userInput.trim().length < 2) {
        return {
          response: `Please enter a valid name (at least 2 characters):`,
          endSession: false,
          nextLevel: 10
        };
      }
      return {
        response: `Enter your hospital/facility name:`,
        endSession: false,
        nextLevel: 11,
        sessionData: { ...sessionData, name: userInput.trim() }
      };

    case 11:
      // Facility name input
      if (userInput.trim().length < 2) {
        return {
          response: `Please enter a valid facility name:`,
          endSession: false,
          nextLevel: 11
        };
      }
      return {
        response: `Enter your location (city/area):`,
        endSession: false,
        nextLevel: 12,
        sessionData: { ...sessionData, facilityName: userInput.trim() }
      };

    case 12:
      // Location input and registration completion
      if (userInput.trim().length < 2) {
        return {
          response: `Please enter a valid location:`,
          endSession: false,
          nextLevel: 12
        };
      }

      // Create user account (simplified)
      const newUserData = {
        name: sessionData.name as string,
        facilityName: sessionData.facilityName as string,
        location: userInput.trim(),
        phoneNumber: session.phoneNumber,
        role: 'hospital' as const,
        createdAt: new Date().toISOString()
      };

      try {
        await addDocument('users', newUserData);
        return {
          response: `✅ Registration successful!\nWelcome ${sessionData.name as string}!\n\nYou can now report stock alerts. Dial *789*12345# anytime.`,
          endSession: true
        };
      } catch {
        return {
          response: `❌ Registration failed. Please try again later.`,
          endSession: true
        };
      }

    default:
      return {
        response: `Session error. Please dial *789*12345# to start again.`,
        endSession: true
      };
  }
}

// Get user's recent alerts
async function getUserAlerts(userId: string): Promise<{ response: string; endSession: boolean }> {
  try {
    const alerts = await queryDocuments<StockAlert>('stockAlerts', 'hospitalId', userId);

    if (alerts.length === 0) {
      return {
        response: `No alerts found. Dial *789*12345# to report stock issues.`,
        endSession: true
      };
    }

    const sortedAlerts = alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3); // Show last 3 alerts

    let response = `Your recent alerts:\n\n`;
    sortedAlerts.forEach((alert, index) => {
      const date = new Date(alert.createdAt).toLocaleDateString();
      const status = alert.status.toUpperCase();
      response += `${index + 1}. ${alert.drugs[0]?.drugName || 'Multiple drugs'}\n`;
      response += `   Status: ${status}\n`;
      response += `   Date: ${date}\n\n`;
    });

    response += `For more details, visit the StockAlert app.`;

    return {
      response,
      endSession: true
    };
  } catch {
    return {
      response: `Unable to fetch alerts. Please try again later.`,
      endSession: true
    };
  }
}
