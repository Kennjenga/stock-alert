// Server-side Firestore utilities for API routes and server-side services
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Add a new document to a collection
 * @param collectionName - The name of the collection
 * @param data - The data to add to the document
 * @returns Promise<string> - The ID of the created document
 */
export const addDocument = async <T extends DocumentData>(
  collectionName: string, 
  data: T
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`Document added to ${collectionName} with ID:`, docRef.id);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update an existing document in a collection
 * @param collectionName - The name of the collection
 * @param documentId - The ID of the document to update
 * @param data - The data to update in the document
 * @returns Promise<void>
 */
export const updateDocument = async <T extends DocumentData>(
  collectionName: string, 
  documentId: string, 
  data: Partial<T>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    console.log(`Document updated in ${collectionName} with ID:`, documentId);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document from a collection
 * @param collectionName - The name of the collection
 * @param documentId - The ID of the document to delete
 * @returns Promise<void>
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    console.log(`Document deleted from ${collectionName} with ID:`, documentId);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get a single document by ID (one-time fetch)
 * @param collectionName - The name of the collection
 * @param documentId - The ID of the document to fetch
 * @returns Promise<T | null> - The document data or null if not found
 */
export const getDocumentById = async <T extends DocumentData>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as unknown as T;
      console.log(`Document fetched from ${collectionName} with ID:`, documentId);
      return data;
    } else {
      console.log(`Document not found in ${collectionName} with ID:`, documentId);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching document from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Check if a document exists
 * @param collectionName - The name of the collection
 * @param documentId - The ID of the document to check
 * @returns Promise<boolean> - True if document exists, false otherwise
 */
export const documentExists = async (
  collectionName: string,
  documentId: string
): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error(`Error checking document existence in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Add a document with a custom ID
 * @param collectionName - The name of the collection
 * @param documentId - The custom ID for the document
 * @param data - The data to add to the document
 * @returns Promise<void>
 */
export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`Document set in ${collectionName} with ID:`, documentId);
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Query documents by a field value
 * @param collectionName - The name of the collection
 * @param field - The field to query by
 * @param value - The value to match
 * @returns Promise<T[]> - Array of matching documents
 */
export const queryDocuments = async <T extends DocumentData>(
  collectionName: string,
  field: string,
  value: unknown
): Promise<T[]> => {
  try {
    const q = query(collection(db, collectionName), where(field, '==', value));
    const querySnapshot = await getDocs(q);
    const documents: T[] = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as unknown as T);
    });

    console.log(`Found ${documents.length} documents in ${collectionName} where ${field} == ${value}`);
    return documents;
  } catch (error) {
    console.error(`Error querying documents in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all documents from a collection
 * @param collectionName - The name of the collection
 * @returns Promise<T[]> - Array of all documents
 */
export const getAllDocuments = async <T extends DocumentData>(
  collectionName: string
): Promise<T[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents: T[] = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as unknown as T);
    });

    console.log(`Found ${documents.length} documents in ${collectionName}`);
    return documents;
  } catch (error) {
    console.error(`Error getting all documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document by querying for it first
 * @param collectionName - The name of the collection
 * @param field - The field to query by
 * @param value - The value to match
 * @param updates - The data to update
 * @returns Promise<boolean> - True if document was found and updated
 */
export const updateDocumentByQuery = async <T extends DocumentData>(
  collectionName: string,
  field: string,
  value: unknown,
  updates: Partial<T>
): Promise<boolean> => {
  try {
    const q = query(collection(db, collectionName), where(field, '==', value));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log(`Document updated in ${collectionName} where ${field} == ${value}`);
      return true;
    } else {
      console.log(`No document found in ${collectionName} where ${field} == ${value}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};
