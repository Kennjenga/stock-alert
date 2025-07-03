'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  DocumentData,
  QueryConstraint,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Generic hook to fetch a collection with filters
export function useCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  deps: React.DependencyList = []
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

// Hook to fetch a single document by ID
export function useDocument<T>(
  collectionName: string,
  documentId: string | undefined,
  deps: React.DependencyList = []
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// Get a single document by ID (one-time fetch)
export const getDocumentById = async <T extends DocumentData>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as unknown as T;
  } else {
    return null;
  }
};
