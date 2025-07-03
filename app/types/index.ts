// Type definitions for the application

// User roles
export type UserRole = 'hospital' | 'supplier';

// User data structure
export interface UserData {
  uid: string;
  email: string | null;
  role: UserRole;
  name?: string;
  facilityName?: string;
  location?: string;
  phoneNumber?: string;
  createdAt?: string;
}

// Drug urgency levels
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

// Drug inventory item
export interface Drug {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string; // e.g., 'tablets', 'bottles', 'vials'
}

// Drug requirement for alerts (supports multiple drugs)
export interface DrugRequirement {
  drugId?: string;
  drugName: string;
  category?: string;
  requestedQuantity: number;
  currentQuantity?: number;
  urgencyLevel: UrgencyLevel;
  unit: string;
  notes?: string;
}

// Stock alert model (updated for multiple drugs)
export interface StockAlert {
  id: string;
  hospitalId: string;
  hospitalName: string;
  facilityName: string;
  drugs: DrugRequirement[]; // Array of drug requirements
  supplierId?: string; // Selected supplier
  supplierName?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  createdAt: string;
  resolvedAt?: string;
  status: 'pending' | 'acknowledged' | 'fulfilled' | 'cancelled';
  notes?: string;
  overallUrgency: UrgencyLevel; // Highest urgency from all drugs
}

// Hospital inventory item
export interface InventoryItem {
  id: string;
  hospitalId: string;
  drugId?: string;
  drugName: string;
  category: string;
  currentQuantity: number;
  minimumThreshold: number;
  maximumCapacity?: number;
  unit: string;
  costPerUnit?: number;
  lastRestocked?: string;
  expiryDate?: string;
  supplier?: string; // Supplier ID
  supplierName?: string; // Supplier Name
  location?: string; // Storage location within facility
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Supplier model
export interface Supplier {
  id: string;
  name: string;
  facilityName?: string;
  email: string;
  phoneNumber: string;
  address?: string;
  specialties?: string[]; // Drug categories they can supply
}

// Notification model
export interface Notification {
  id: string;
  recipientId: string;
  type: 'sms' | 'email' | 'inApp';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedAlertId?: string;
}

// Response from SMS API
export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Airtime reward
export interface AirtimeReward {
  id: string;
  userId: string;
  phoneNumber: string;
  amount: number;
  status: 'pending' | 'sent' | 'failed';
  alertId: string;
  transactionId?: string;
  failureReason?: string;
  createdAt: string;
}

// OTP Verification Types
export interface OTPVerification {
  id: string;
  phoneNumber: string;
  otpCode: string;
  purpose: 'registration' | 'password_reset' | 'phone_verification';
  status: 'pending' | 'verified' | 'expired' | 'failed';
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  verifiedAt?: string;
  userData?: Partial<UserData>; // Store registration data temporarily
  createdAt: string;
  updatedAt: string;
}

export interface OTPResponse {
  success: boolean;
  otpId?: string;
  message: string;
  expiresAt?: string;
  attemptsRemaining?: number;
}

export interface OTPVerificationRequest {
  otpId: string;
  otpCode: string;
}

export interface OTPVerificationResponse {
  success: boolean;
  message: string;
  userData?: UserData;
  attemptsRemaining?: number;
}

// Supplier preferences for alert filtering
export interface SupplierPreferences {
  id: string;
  supplierId: string;
  drugCategories: string[]; // Categories of drugs they supply
  urgencyLevels: UrgencyLevel[]; // Urgency levels they want to be notified about
  geographicRegions: string[]; // Regions they serve (e.g., 'Nairobi', 'Mombasa')
  maxDistance?: number; // Maximum distance in km from their location
  minimumOrderValue?: number; // Minimum order value they're interested in
  notificationMethods: ('sms' | 'email' | 'inApp')[]; // Preferred notification methods
  businessHours?: {
    start: string; // e.g., '08:00'
    end: string; // e.g., '18:00'
    timezone: string; // e.g., 'Africa/Nairobi'
    workingDays: number[]; // 0-6 (Sunday-Saturday)
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// SMS delivery tracking
export interface SMSDelivery {
  id: string;
  messageId: string;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  provider: string; // e.g., 'africastalking'
  cost?: number;
  deliveredAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  alertId?: string; // Related stock alert
  createdAt: string;
  updatedAt: string;
}

// USSD session management
export interface USSDSession {
  id: string;
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  currentLevel: number;
  sessionData: Record<string, any>; // Store user inputs and state
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  provider: 'safaricom' | 'airtel' | 'orange';
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  expiresAt: string;
}

// Enhanced SMS Response with delivery tracking
export interface EnhancedSMSResponse extends SMSResponse {
  deliveryId?: string;
  cost?: number;
  provider?: string;
  estimatedDeliveryTime?: string;
}

// Alert distribution log
export interface AlertDistribution {
  id: string;
  alertId: string;
  supplierId: string;
  supplierName: string;
  notificationMethod: 'sms' | 'email' | 'inApp';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  messageId?: string;
  createdAt: string;
}

// Geographic region for supplier filtering
export interface GeographicRegion {
  id: string;
  name: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  parentRegion?: string; // For hierarchical regions (e.g., county -> subcounty)
  isActive: boolean;
}

// Drug category for filtering
export interface DrugCategory {
  id: string;
  name: string;
  description?: string;
  parentCategory?: string; // For hierarchical categories
  isActive: boolean;
}
