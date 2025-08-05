import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Situation, BeforeItem, AfterItem } from './types';
import { ParsedBeforeAfterData } from './beforeAfterParser';

// Situation CRUD Operations
export const createSituation = async (title: string): Promise<string> => {
  try {
    // Use timestamp for ordering (no database query needed)
    const timestamp = Date.now();
    const situationId = `situation_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const situationData = {
      id: situationId,
      title: title.trim(),
      order: timestamp, // Timestamp-based ordering
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'situations'), situationData);
    return situationId;
  } catch (error) {
    console.error('Error creating situation:', error);
    throw new Error('Failed to create situation');
  }
};

// Bulk create situations - optimized for performance
export const createMultipleSituations = async (titles: string[]): Promise<string[]> => {
  try {
    const createdIds: string[] = [];
    const batch = [];
    const baseTimestamp = Date.now();
    
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      if (title.trim()) {
        // Use timestamp + index for ordering (no database query needed)
        const situationId = `situation_${baseTimestamp}_${i}_${Math.random().toString(36).substr(2, 6)}`;
        const situationData = {
          id: situationId,
          title: title.trim(),
          order: baseTimestamp + i, // Timestamp-based ordering
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        batch.push(addDoc(collection(db, 'situations'), situationData));
        createdIds.push(situationId);
      }
    }
    
    // Execute all creates in parallel
    await Promise.all(batch);
    return createdIds;
  } catch (error) {
    console.error('Error creating multiple situations:', error);
    throw new Error('Failed to create situations');
  }
};

export const updateSituation = async (
  situationId: string, 
  updates: { title?: string }
): Promise<void> => {
  try {
    const situationsRef = collection(db, 'situations');
    const q = query(situationsRef, where('id', '==', situationId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error('Error updating situation:', error);
    throw new Error('Failed to update situation');
  }
};

export const deleteSituation = async (situationId: string): Promise<void> => {
  try {
    // First delete all related before items and their after items
    const beforeItems = await getBeforeItems(situationId);
    for (const beforeItem of beforeItems) {
      await deleteBeforeItem(beforeItem.id);
    }
    
    // Then delete the situation
    const situationsRef = collection(db, 'situations');
    const q = query(situationsRef, where('id', '==', situationId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }
  } catch (error) {
    console.error('Error deleting situation:', error);
    throw new Error('Failed to delete situation');
  }
};

export const getAllSituations = async (): Promise<Situation[]> => {
  try {
    const situationsRef = collection(db, 'situations');
    const q = query(situationsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        title: data.title,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting situations:', error);
    return [];
  }
};

// Before Item CRUD Operations
export const createBeforeItem = async (
  situationId: string, 
  title: string
): Promise<string> => {
  try {
    // Get current max order for this situation
    const beforeItemsRef = collection(db, 'beforeItems');
    const q = query(
      beforeItemsRef, 
      where('situationId', '==', situationId),
      orderBy('order', 'desc')
    );
    const snapshot = await getDocs(q);
    const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
    
    const beforeItemId = `before_${Date.now()}`;
    const beforeItemData = {
      id: beforeItemId,
      situationId,
      title: title.trim(),
      order: maxOrder + 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'beforeItems'), beforeItemData);
    return beforeItemId;
  } catch (error) {
    console.error('Error creating before item:', error);
    throw new Error('Failed to create before item');
  }
};

export const updateBeforeItem = async (
  beforeItemId: string, 
  updates: { title?: string }
): Promise<void> => {
  try {
    const beforeItemsRef = collection(db, 'beforeItems');
    const q = query(beforeItemsRef, where('id', '==', beforeItemId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error('Error updating before item:', error);
    throw new Error('Failed to update before item');
  }
};

export const deleteBeforeItem = async (beforeItemId: string): Promise<void> => {
  try {
    // First delete all related after items
    const afterItems = await getAfterItems(beforeItemId);
    for (const afterItem of afterItems) {
      await deleteAfterItem(afterItem.id);
    }
    
    // Then delete the before item
    const beforeItemsRef = collection(db, 'beforeItems');
    const q = query(beforeItemsRef, where('id', '==', beforeItemId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }
  } catch (error) {
    console.error('Error deleting before item:', error);
    throw new Error('Failed to delete before item');
  }
};

// Bulk create before items
export const createMultipleBeforeItems = async (situationId: string, titles: string[]): Promise<string[]> => {
  try {
    const beforeItemsRef = collection(db, 'beforeItems');
    const q = query(
      beforeItemsRef, 
      where('situationId', '==', situationId),
      orderBy('order', 'desc')
    );
    const snapshot = await getDocs(q);
    let maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
    
    const createdIds: string[] = [];
    const batch = [];
    
    for (const title of titles) {
      if (title.trim()) {
        maxOrder += 1;
        const beforeItemId = `before_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const beforeItemData = {
          id: beforeItemId,
          situationId,
          title: title.trim(),
          order: maxOrder,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        batch.push(addDoc(collection(db, 'beforeItems'), beforeItemData));
        createdIds.push(beforeItemId);
      }
    }
    
    await Promise.all(batch);
    return createdIds;
  } catch (error) {
    console.error('Error creating multiple before items:', error);
    throw new Error('Failed to create before items');
  }
};

export const getBeforeItems = async (situationId: string): Promise<BeforeItem[]> => {
  try {
    const beforeItemsRef = collection(db, 'beforeItems');
    const q = query(
      beforeItemsRef, 
      where('situationId', '==', situationId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        situationId: data.situationId,
        title: data.title,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting before items:', error);
    return [];
  }
};

// After Item CRUD Operations
export const createAfterItem = async (
  beforeItemId: string, 
  title: string
): Promise<string> => {
  try {
    // Get current max order for this before item
    const afterItemsRef = collection(db, 'afterItems');
    const q = query(
      afterItemsRef, 
      where('beforeItemId', '==', beforeItemId),
      orderBy('order', 'desc')
    );
    const snapshot = await getDocs(q);
    const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
    
    const afterItemId = `after_${Date.now()}`;
    const afterItemData = {
      id: afterItemId,
      beforeItemId,
      title: title.trim(),
      order: maxOrder + 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'afterItems'), afterItemData);
    return afterItemId;
  } catch (error) {
    console.error('Error creating after item:', error);
    throw new Error('Failed to create after item');
  }
};

export const updateAfterItem = async (
  afterItemId: string, 
  updates: { title?: string }
): Promise<void> => {
  try {
    const afterItemsRef = collection(db, 'afterItems');
    const q = query(afterItemsRef, where('id', '==', afterItemId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      await updateDoc(docRef, updateData);
    }
  } catch (error) {
    console.error('Error updating after item:', error);
    throw new Error('Failed to update after item');
  }
};

export const deleteAfterItem = async (afterItemId: string): Promise<void> => {
  try {
    const afterItemsRef = collection(db, 'afterItems');
    const q = query(afterItemsRef, where('id', '==', afterItemId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }
  } catch (error) {
    console.error('Error deleting after item:', error);
    throw new Error('Failed to delete after item');
  }
};

export const getAfterItems = async (beforeItemId: string): Promise<AfterItem[]> => {
  try {
    const afterItemsRef = collection(db, 'afterItems');
    const q = query(
      afterItemsRef, 
      where('beforeItemId', '==', beforeItemId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        beforeItemId: data.beforeItemId,
        title: data.title,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting after items:', error);
    return [];
  }
};

// Bulk create after items
export const createMultipleAfterItems = async (beforeItemId: string, titles: string[]): Promise<string[]> => {
  try {
    const afterItemsRef = collection(db, 'afterItems');
    const q = query(
      afterItemsRef, 
      where('beforeItemId', '==', beforeItemId),
      orderBy('order', 'desc')
    );
    const snapshot = await getDocs(q);
    let maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
    
    const createdIds: string[] = [];
    const batch = [];
    
    for (const title of titles) {
      if (title.trim()) {
        maxOrder += 1;
        const afterItemId = `after_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const afterItemData = {
          id: afterItemId,
          beforeItemId,
          title: title.trim(),
          order: maxOrder,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        batch.push(addDoc(collection(db, 'afterItems'), afterItemData));
        createdIds.push(afterItemId);
      }
    }
    
    await Promise.all(batch);
    return createdIds;
  } catch (error) {
    console.error('Error creating multiple after items:', error);
    throw new Error('Failed to create after items');
  }
};

// Bulk create/update before and after items from parsed content
export const saveBeforeAfterItemsFromContent = async (
  situationId: string, 
  parsedData: { beforeItems: Array<{ title: string; afterItems: string[] }> }
): Promise<void> => {
  try {
    // First, delete all existing before and after items for this situation
    await deleteAllBeforeAfterItemsForSituation(situationId);
    
    // Prepare all documents to be created
    const beforePromises = [];
    const afterPromises = [];
    const now = Timestamp.now();
    let beforeOrder = 1;
    
    for (const beforeData of parsedData.beforeItems) {
      // Create before item
      const beforeItemId = `before_${Date.now()}_${beforeOrder}`;
      const beforeItemData = {
        id: beforeItemId,
        situationId,
        title: beforeData.title.trim(),
        order: beforeOrder,
        createdAt: now,
        updatedAt: now,
      };
      
      beforePromises.push(addDoc(collection(db, 'beforeItems'), beforeItemData));
      
      // Create after items for this before item
      let afterOrder = 1;
      for (const afterTitle of beforeData.afterItems) {
        const afterItemId = `after_${Date.now()}_${beforeOrder}_${afterOrder}`;
        const afterItemData = {
          id: afterItemId,
          beforeItemId,
          title: afterTitle.trim(),
          order: afterOrder,
          createdAt: now,
          updatedAt: now,
        };
        
        afterPromises.push(addDoc(collection(db, 'afterItems'), afterItemData));
        afterOrder++;
      }
      
      beforeOrder++;
    }
    
    // Execute all operations in parallel
    await Promise.all([...beforePromises, ...afterPromises]);
  } catch (error) {
    console.error('Error saving before/after items from content:', error);
    throw new Error('Failed to save before/after items');
  }
};

// Helper function to delete all before and after items for a situation
const deleteAllBeforeAfterItemsForSituation = async (situationId: string): Promise<void> => {
  try {
    // Get all before items for this situation
    const beforeItemsRef = collection(db, 'beforeItems');
    const beforeQuery = query(beforeItemsRef, where('situationId', '==', situationId));
    const beforeSnapshot = await getDocs(beforeQuery);
    
    // Delete all after items for each before item, then delete the before items
    const deletePromises = [];
    
    for (const beforeDoc of beforeSnapshot.docs) {
      const beforeItemId = beforeDoc.data().id;
      
      // Get and delete all after items for this before item
      const afterItemsRef = collection(db, 'afterItems');
      const afterQuery = query(afterItemsRef, where('beforeItemId', '==', beforeItemId));
      const afterSnapshot = await getDocs(afterQuery);
      
      // Delete after items
      for (const afterDoc of afterSnapshot.docs) {
        deletePromises.push(deleteDoc(afterDoc.ref));
      }
      
      // Delete before item
      deletePromises.push(deleteDoc(beforeDoc.ref));
    }
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting before/after items for situation:', error);
    throw new Error('Failed to delete existing before/after items');
  }
};

// Get all before and after items for a situation in a format suitable for content display
export const getBeforeAfterContentForSituation = async (situationId: string): Promise<string> => {
  try {
    // Get all before items for this situation
    const beforeItems = await getBeforeItems(situationId);
    
    // Get after items for each before item
    const afterItemsMap = new Map<string, AfterItem[]>();
    
    for (const beforeItem of beforeItems) {
      const afterItems = await getAfterItems(beforeItem.id);
      afterItemsMap.set(beforeItem.id, afterItems);
    }
    
    // Format as content
    let content = '';
    let beforeIndex = 1;
    
    for (const beforeItem of beforeItems) {
      content += `${beforeIndex}. ${beforeItem.title}\n`;
      
      const afterItems = afterItemsMap.get(beforeItem.id) || [];
      let afterIndex = 0;
      
      for (const afterItem of afterItems) {
        const letter = String.fromCharCode(97 + afterIndex); // 97 = 'a'
        content += `   ${letter}. ${afterItem.title}\n`;
        afterIndex++;
      }
      
      beforeIndex++;
    }
    
    return content.trim();
  } catch (error) {
    console.error('Error getting before/after content for situation:', error);
    throw new Error('Failed to get before/after content');
  }
};
