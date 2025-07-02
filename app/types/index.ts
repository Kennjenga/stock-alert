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
  createdAt: string;
}
