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
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { Situation, BeforeItem, AfterItem } from './types';
import { ParsedBeforeAfterData } from './beforeAfterParser';

// Situation CRUD Operations
export const createSituation = async (title: string): Promise<string> => {
  console.log('🚨 SITUATION CREATION: createSituation called with title:', title);
  console.trace('🚨 SITUATION CREATION: Call stack');
  try {
    // Use timestamp for ordering (no database query needed)
    const timestamp = Date.now();
    const situationId = `situation_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🚨 SITUATION CREATION: Generated ID:', situationId);
    const situationData = {
      id: situationId,
      title: title.trim(),
      order: timestamp, // Timestamp-based ordering
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'situations'), situationData);
    console.log('🚨 SITUATION CREATION: Successfully created situation:', situationId);
    return situationId;
  } catch (error) {
    console.error('Error creating situation:', error);
    throw new Error('Failed to create situation');
  }
};

// Clean up corrupted situations with undefined IDs
export const cleanupCorruptedSituations = async (): Promise<void> => {
  try {
    const situationsRef = collection(db, 'situations');
    const snapshot = await getDocs(situationsRef);
    
    const batch = writeBatch(db);
    let cleanupCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.id || data.id === 'undefined' || typeof data.id !== 'string') {
        console.log('🧹 CLEANUP: Removing corrupted situation:', doc.id, data);
        batch.delete(doc.ref);
        cleanupCount++;
      }
    });
    
    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`✅ CLEANUP: Removed ${cleanupCount} corrupted situations`);
    } else {
      console.log('✅ CLEANUP: No corrupted situations found');
    }
  } catch (error) {
    console.error('❌ CLEANUP: Error cleaning up corrupted situations:', error);
  }
};

// Bulk create situations - optimized for performance
export const createMultipleSituations = async (titles: string[]): Promise<Situation[]> => {
  console.log('✅ DATABASE: createMultipleSituations called with titles:', titles);
  const batch = writeBatch(db);
  const newSituations: Situation[] = [];
  const baseTimestamp = Date.now();

  titles.forEach((title, index) => {
    if (title.trim()) {
      const situationRef = doc(collection(db, 'situations'));
      const newSituationData = {
        id: situationRef.id,  // CRITICAL: Save the ID to the document
        title: title.trim(),
        order: baseTimestamp + index,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      batch.set(situationRef, newSituationData);
      newSituations.push({ ...newSituationData, id: situationRef.id });
    }
  });

  try {
    await batch.commit();
    console.log(`✅ DATABASE: Batch committed, created ${newSituations.length} situations.`);
    return newSituations;
  } catch (error) {
    console.error('❌ DATABASE: Error committing batch:', error);
    throw new Error('Failed to create situations in database.');
  }
};

export const updateSituation = async (
  situationId: string, 
  updates: { title?: string }
): Promise<void> => {
  console.log('🔍 UPDATE: updateSituation called for ID:', situationId, 'updates:', updates);
  console.trace('🔍 UPDATE: Call stack');
  try {
    const situationsRef = collection(db, 'situations');
    const q = query(situationsRef, where('id', '==', situationId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('🔍 UPDATE: Found situation to update, doc ID:', snapshot.docs[0].id);
      const docRef = snapshot.docs[0].ref;
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      console.log('🔍 UPDATE: Updating with data:', updateData);
      await updateDoc(docRef, updateData);
      console.log('🔍 UPDATE: Successfully updated situation:', situationId);
    } else {
      console.log('🔍 UPDATE: No situation found with ID:', situationId);
    }
  } catch (error) {
    console.error('❌ Error updating situation:', error);
    throw new Error('Failed to update situation');
  }
};

export const deleteSituation = async (situationId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Get all related data in parallel
    const [beforeItems, situationDocs] = await Promise.all([
      getBeforeItems(situationId),
      getDocs(query(collection(db, 'situations'), where('id', '==', situationId)))
    ]);
    
    // Get all after items for all before items in parallel
    const afterItemsPromises = beforeItems.map(beforeItem => getAfterItems(beforeItem.id));
    const allAfterItems = await Promise.all(afterItemsPromises);
    
    // Get document references for all after items
    const afterItemDocPromises = allAfterItems.flat().map(async afterItem => {
      const afterItemsRef = collection(db, 'afterItems');
      const afterItemQuery = query(afterItemsRef, where('id', '==', afterItem.id));
      const snapshot = await getDocs(afterItemQuery);
      return snapshot.empty ? null : snapshot.docs[0].ref;
    });
    
    const afterItemRefs = (await Promise.all(afterItemDocPromises)).filter(ref => ref !== null);
    
    // Get document references for all before items
    const beforeItemDocPromises = beforeItems.map(async beforeItem => {
      const beforeItemsRef = collection(db, 'beforeItems');
      const beforeItemQuery = query(beforeItemsRef, where('id', '==', beforeItem.id));
      const snapshot = await getDocs(beforeItemQuery);
      return snapshot.empty ? null : snapshot.docs[0].ref;
    });
    
    const beforeItemRefs = (await Promise.all(beforeItemDocPromises)).filter(ref => ref !== null);
    
    // Add all document references to batch delete
    afterItemRefs.forEach(ref => batch.delete(ref));
    beforeItemRefs.forEach(ref => batch.delete(ref));
    
    // Add situation to batch delete
    if (!situationDocs.empty) {
      batch.delete(situationDocs.docs[0].ref);
    }
    
    // Execute all deletes in a single atomic batch operation
    await batch.commit();
  } catch (error) {
    console.error('Error deleting situation:', error);
    throw new Error('Failed to delete situation');
  }
};

export const getAllSituations = async (): Promise<Situation[]> => {
  console.log('🔍 DATABASE: getAllSituations called');
  try {
    const situationsRef = collection(db, 'situations');
    const q = query(situationsRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    const situations = snapshot.docs.map(doc => {
      const data = doc.data();
      const situation = {
        id: data.id,
        title: data.title,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
      console.log('🔍 DATABASE: Found situation in DB:', situation.id, 'title:', situation.title);
      return situation;
    });
    
    console.log('🔍 DATABASE: getAllSituations returning', situations.length, 'situations');
    return situations;
  } catch (error) {
    console.error('❌ Error getting situations:', error);
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
    throw new Error('Failed to get before items');
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
  console.log('🔄 Starting saveBeforeAfterItemsFromContent for situation:', situationId);
  console.log('📝 Parsed data:', parsedData);
  
  try {
    // Step 1: Get existing items
    console.log('📋 Getting existing items...');
    const [beforeItems, beforeItemsSnapshot] = await Promise.all([
      getBeforeItems(situationId),
      getDocs(query(collection(db, 'beforeItems'), where('situationId', '==', situationId)))
    ]);
    
    console.log('📋 Found existing before items:', beforeItems.length);
    
    // Step 2: Delete existing items if any
    if (beforeItems.length > 0) {
      console.log('🗑️ Deleting existing items...');
      const batch = writeBatch(db);
      
      // Get all after items for existing before items
      const afterItemsPromises = beforeItems.map(beforeItem => 
        getDocs(query(collection(db, 'afterItems'), where('beforeItemId', '==', beforeItem.id)))
      );
      const afterItemsSnapshots = await Promise.all(afterItemsPromises);
      
      // Add all existing items to batch delete
      beforeItemsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      afterItemsSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
      });
      
      await batch.commit();
      console.log('✅ Deleted existing items');
    }
    
    // Step 3: Create new items
    console.log('➕ Creating new items...');
    const now = Timestamp.now();
    let beforeOrder = 1;
    
    const beforePromises = [];
    const afterPromises = [];
    
    for (const beforeData of parsedData.beforeItems) {
      // Create before item
      const beforeItemId = `before_${Date.now()}_${beforeOrder}_${Math.random().toString(36).substr(2, 6)}`;
      const beforeItemData = {
        id: beforeItemId,
        situationId,
        title: beforeData.title.trim(),
        order: beforeOrder,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('📝 Creating before item:', beforeItemData);
      beforePromises.push(addDoc(collection(db, 'beforeItems'), beforeItemData));
      
      // Create after items for this before item
      let afterOrder = 1;
      for (const afterTitle of beforeData.afterItems) {
        const afterItemId = `after_${Date.now()}_${beforeOrder}_${afterOrder}_${Math.random().toString(36).substr(2, 6)}`;
        const afterItemData = {
          id: afterItemId,
          beforeItemId,
          title: afterTitle.trim(),
          order: afterOrder,
          createdAt: now,
          updatedAt: now,
        };
        
        console.log('📝 Creating after item:', afterItemData);
        afterPromises.push(addDoc(collection(db, 'afterItems'), afterItemData));
        afterOrder++;
      }
      
      beforeOrder++;
    }
    
    // Execute all creates
    const results = await Promise.all([...beforePromises, ...afterPromises]);
    console.log('✅ Created items successfully:', results.length);
    
    // Step 4: Verify the save worked
    console.log('🔍 Verifying save...');
    const verifyBeforeItems = await getBeforeItems(situationId);
    console.log('✅ Verification: Found', verifyBeforeItems.length, 'before items after save');
    
  } catch (error) {
    console.error('❌ Error saving before/after items from content:', error);
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
