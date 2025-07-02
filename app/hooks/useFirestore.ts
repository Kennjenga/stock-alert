'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Generic hook to fetch a collection with filters
export function useCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('useCollection: Fetching data for collection:', collectionName, 'with constraints:', constraints);
        const q = query(collection(db, collectionName), ...constraints);
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          console.log('useCollection: Snapshot received for collection:', collectionName, '. Documents found:', querySnapshot.size);
          const items: T[] = [];
          querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as T);
          });
          console.log('useCollection: Parsed items:', items);
          setData(items);
          setLoading(false);
        }, (err) => {
          console.error('useCollection: Snapshot error:', err);
          setError(err as Error);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        console.error('useCollection: FetchData error:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, deps);

  return { data, loading, error };
}

// Hook to fetch a single document by ID
export function useDocument<T>(
  collectionName: string,
  documentId: string | undefined,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, collectionName, documentId);
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setData({ id: docSnapshot.id, ...docSnapshot.data() } as T);
          } else {
            setData(null);
          }
          setLoading(false);
        }, (err) => {
          setError(err as Error);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchDocument();
  }, [collectionName, documentId, ...deps]);

  return { data, loading, error };
}

// CRUD operations
export const addDocument = async <T extends DocumentData>(
  collectionName: string, 
  data: T
): Promise<string> => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateDocument = async <T extends DocumentData>(
  collectionName: string, 
  documentId: string, 
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteDocument = async (
  collectionName: string, 
  documentId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, documentId);
  await deleteDoc(docRef);
};
