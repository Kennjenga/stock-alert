'use server';

import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { StockAlert, InventoryItem } from '../types';

/**
 * Replenishes a hospital's inventory after a stock alert is fulfilled.
 * @param alert The stock alert that has been fulfilled.
 */
export async function replenishInventory(alert: StockAlert): Promise<void> {
  if (!alert || !alert.hospitalId || !alert.drugs || alert.drugs.length === 0) {
    console.error('Invalid alert data provided for inventory replenishment.');
    return;
  }

  console.log(`Replenishing inventory for hospital ${alert.hospitalId} from alert ${alert.id}`);

  const batch = writeBatch(db);

  try {
    // Get all inventory items for the hospital
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('hospitalId', '==', alert.hospitalId)
    );
    const inventorySnapshot = await getDocs(inventoryQuery);
    const inventoryItems = inventorySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));

    for (const drug of alert.drugs) {
      // Find the matching item in the inventory by drug name or ID
      const inventoryItem = inventoryItems.find(item => 
        (item.drugId && item.drugId === drug.drugId) || (item.drugName.toLowerCase() === drug.drugName.toLowerCase())
      );

      if (inventoryItem) {
        const newQuantity = (inventoryItem.currentQuantity || 0) + drug.requestedQuantity;
        const itemRef = doc(db, 'inventory', inventoryItem.id);
        batch.update(itemRef, { currentQuantity: newQuantity });
        console.log(`Updating inventory for ${drug.drugName}. New quantity: ${newQuantity}`);
      } else {
        // If the drug is not in the inventory, it could be added here.
        // For now, we'll just log it.
        console.warn(`Drug "${drug.drugName}" from alert not found in hospital's inventory. Cannot replenish.`);
      }
    }

    await batch.commit();
    console.log('Inventory replenishment successful.');

  } catch (error) {
    console.error('Error replenishing inventory:', error);
    // Note: Batch is not committed if an error occurs.
  }
}
