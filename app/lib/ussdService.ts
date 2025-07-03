// Service to handle USSD integrations with real telecom provider support
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { addDocument } from '../hooks/useFirestore';
import { StockAlert, UrgencyLevel, USSDSession, UserData } from '../types';
import { distributeAlertToSuppliers } from './supplierFilteringService';
import { rewardUserWithAirtime } from './airtimeService';

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
      supplierId: '', // Set to empty string or appropriate value if available
    };

    const alertId = await addDocument<Omit<StockAlert, 'id'>>('stockAlerts', alertData);

    // 2. Use the new filtering system to distribute alerts to eligible suppliers
    const alert: StockAlert = { id: alertId, ...alertData };
    await distributeAlertToSuppliers(alert, alert.supplierId);

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

// Create or update USSD session
export async function createUSSDSession(
  sessionId: string,
  phoneNumber: string,
  serviceCode: string,
  provider: 'safaricom' | 'airtel' | 'orange'
): Promise<USSDSession> {
  const session: Omit<USSDSession, 'id'> = {
    sessionId,
    phoneNumber,
    serviceCode,
    currentLevel: 1,
    sessionData: {},
    status: 'active',
    provider,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  };

  const sessionDocId = await addDocument<Omit<USSDSession, 'id'>>('ussdSessions', session);
  return { id: sessionDocId, ...session };
}

// Update USSD session
export async function updateUSSDSession(
  sessionId: string,
  updates: Partial<USSDSession>
): Promise<void> {
  try {
    const sessionsQuery = query(
      collection(db, 'ussdSessions'),
      where('sessionId', '==', sessionId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    if (!sessionsSnapshot.empty) {
      const sessionDoc = sessionsSnapshot.docs[0];
      await updateDoc(sessionDoc.ref, {
        ...updates,
        lastActivityAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to update USSD session:', error);
  }
}

// Get USSD session
export async function getUSSDSession(sessionId: string): Promise<USSDSession | null> {
  try {
    const sessionsQuery = query(
      collection(db, 'ussdSessions'),
      where('sessionId', '==', sessionId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    if (!sessionsSnapshot.empty) {
      const sessionDoc = sessionsSnapshot.docs[0];
      return { id: sessionDoc.id, ...sessionDoc.data() } as USSDSession;
    }

    return null;
  } catch (error) {
    console.error('Failed to get USSD session:', error);
    return null;
  }
}

// Check if session is expired
export function isSessionExpired(session: USSDSession): boolean {
  return new Date() > new Date(session.expiresAt);
}

// Get user by phone number
export async function getUserByPhone(phoneNumber: string): Promise<UserData | null> {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('phoneNumber', '==', phoneNumber)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      return { uid: userDoc.id, ...userDoc.data() } as UserData;
    }

    return null;
  } catch (error) {
    console.error('Failed to get user by phone:', error);
    return null;
  }
}

// Enhanced USSD session handler with real telecom provider support
export async function handleUssdSession(
  sessionId: string,
  phoneNumber: string,
  userInput: string,
  serviceCode: string,
  provider: 'safaricom' | 'airtel' | 'orange'
): Promise<{ response: string; endSession: boolean; nextLevel?: number }> {
  try {
    // Get or create session
    let session = await getUSSDSession(sessionId);

    if (!session) {
      session = await createUSSDSession(sessionId, phoneNumber, serviceCode, provider);
    }

    // Check if session is expired
    if (isSessionExpired(session)) {
      await updateUSSDSession(sessionId, { status: 'expired' });
      return {
        response: `Session expired. Please dial ${serviceCode} again.`,
        endSession: true
      };
    }

    // Get user data
    const user = await getUserByPhone(phoneNumber);

    // Handle different levels of the USSD flow
    const result = await processUSSDLevel(session, userInput, user);

    // Update session with new data
    await updateUSSDSession(sessionId, {
      currentLevel: result.nextLevel || session.currentLevel,
      sessionData: result.sessionData || session.sessionData
    });

    return result;
  } catch (error) {
    console.error('Error handling USSD session:', error);
    return {
      response: `Service temporarily unavailable. Please try again later.`,
      endSession: true
    };
  }
}

// Process USSD level logic
async function processUSSDLevel(
  session: USSDSession,
  userInput: string,
  user: UserData | null
): Promise<{ response: string; endSession: boolean; nextLevel?: number; sessionData?: Record<string, unknown> }> {
  const currentLevel = session.currentLevel;
  const sessionData = session.sessionData;

  // Sample drugs for demonstration (in production, fetch from database)
  const drugs = [
    { id: '1', name: 'Paracetamol', category: 'Analgesics' },
    { id: '2', name: 'Amoxicillin', category: 'Antibiotics' },
    { id: '3', name: 'Ibuprofen', category: 'Analgesics' },
    { id: '4', name: 'Ciprofloxacin', category: 'Antibiotics' },
    { id: '5', name: 'Insulin', category: 'Diabetes' }
  ];

  const urgencyLevels: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

  switch (currentLevel) {
    case 1:
      // Welcome menu
      const welcomeMessage = user
        ? `Welcome ${user.name || 'User'} to StockAlert\n1. Report Low Stock\n2. Check My Alerts\n3. Help\n0. Exit`
        : `Welcome to StockAlert\n1. Report Low Stock\n2. Register\n3. Help\n0. Exit`;

      return {
        response: welcomeMessage,
        endSession: false,
        nextLevel: 2
      };

    case 2:
      // Main menu selection
      switch (userInput) {
        case '1':
          if (!user) {
            return {
              response: `Please register first.\nEnter your name:`,
              endSession: false,
              nextLevel: 10, // Registration flow
              sessionData: { ...sessionData, action: 'register' }
            };
          }
          // Show drug categories
          const categories = [...new Set(drugs.map(d => d.category))];
          const categoryList = categories.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
          return {
            response: `Select drug category:\n${categoryList}\n0. Back`,
            endSession: false,
            nextLevel: 3,
            sessionData: { ...sessionData, action: 'report', categories }
          };

        case '2':
          if (!user) {
            return {
              response: `Please register first by selecting option 2 from main menu.`,
              endSession: true
            };
          }
          // Check user's alerts
          return await getUserAlerts(user.uid);

        case '3':
          return {
            response: `StockAlert Help:\n- Report low drug stock\n- Get real-time alerts\n- Earn airtime rewards\nFor support: Call 0700123456`,
            endSession: true
          };

        case '0':
          return {
            response: `Thank you for using StockAlert. Stay healthy!`,
            endSession: true
          };

        default:
          return {
            response: `Invalid option. Please try again.\n1. Report Low Stock\n2. Check Alerts\n3. Help\n0. Exit`,
            endSession: false,
            nextLevel: 2
          };
      }

    case 3:
      // Drug category selection
      const categories: string[] = Array.isArray(sessionData.categories) ? sessionData.categories : [];
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
      const categoryDrugs = Array.isArray(sessionData.categoryDrugs) ? sessionData.categoryDrugs : [];

      if (userInput === '0') {
        const categories = Array.isArray(sessionData.categories) ? sessionData.categories : [];
        const categoryList = categories.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
        return {
          response: `Select drug category:\n${categoryList}\n0. Back`,
          endSession: false,
          nextLevel: 3
        };
      }

      const drugIndex = parseInt(userInput) - 1;
      if (drugIndex >= 0 && drugIndex < categoryDrugs.length) {
        const selectedDrug = categoryDrugs[drugIndex];
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
          Number(sessionData.quantity),
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
        name: sessionData.name,
        facilityName: sessionData.facilityName,
        location: userInput.trim(),
        phoneNumber: session.phoneNumber,
        role: 'hospital' as const,
        createdAt: new Date().toISOString()
      };

      try {
        await addDocument('users', newUserData);
        return {
          response: `✅ Registration successful!\nWelcome ${sessionData.name}!\n\nYou can now report stock alerts. Dial *789*12345# anytime.`,
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
    const alertsQuery = query(
      collection(db, 'stockAlerts'),
      where('hospitalId', '==', userId)
    );
    const alertsSnapshot = await getDocs(alertsQuery);

    if (alertsSnapshot.empty) {
      return {
        response: `No alerts found. Dial *789*12345# to report stock issues.`,
        endSession: true
      };
    }

    const alerts = alertsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as StockAlert))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3); // Show last 3 alerts

    let response = `Your recent alerts:\n\n`;
    alerts.forEach((alert, index) => {
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
