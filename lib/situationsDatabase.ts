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

// Situation CRUD Operations
export const createSituation = async (title: string, description?: string): Promise<string> => {
  try {
    // Get current max order
    const situationsRef = collection(db, 'situations');
    const snapshot = await getDocs(query(situationsRef, orderBy('order', 'desc')));
    const maxOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order;
    
    const situationId = `situation_${Date.now()}`;
    const situationData = {
      id: situationId,
      title: title.trim(),
      description: description?.trim() || '',
      order: maxOrder + 1,
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

export const updateSituation = async (
  situationId: string, 
  updates: { title?: string; description?: string }
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
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
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
        description: data.description,
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
  title: string, 
  description?: string
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
      description: description?.trim() || '',
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
  updates: { title?: string; description?: string }
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
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
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
        description: data.description,
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
  title: string, 
  description?: string
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
      description: description?.trim() || '',
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
  updates: { title?: string; description?: string }
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
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim();
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
        description: data.description,
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
