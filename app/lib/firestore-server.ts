// Server-side Firestore utilities for API routes and server-side services
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
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
      const data = { id: docSnap.id, ...docSnap.data() } as T;
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
