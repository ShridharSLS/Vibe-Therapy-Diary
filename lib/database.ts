import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Diary, Card } from './types';
import { generateUniqueDiaryId } from './utils';

// Diary operations
export const createDiary = async (
  clientId: string,
  name: string,
  gender: 'Male' | 'Female' | 'Other'
): Promise<string> => {
  try {
    const diaryId = await generateUniqueDiaryId();
    const diaryData = {
      id: diaryId,
      clientId: clientId.trim(),
      name: name.trim(),
      gender,
      url: `/diary/${diaryId}`,
      cardReadingCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'diaries'), diaryData);
    return diaryId;
  } catch (error) {
    console.error('Error creating diary:', error);
    throw new Error('Failed to create diary');
  }
};

export const getDiary = async (diaryId: string): Promise<Diary | null> => {
  try {
    const diariesRef = collection(db, 'diaries');
    const q = query(diariesRef, where('id', '==', diaryId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: data.id,
      clientId: data.clientId,
      name: data.name,
      gender: data.gender,
      url: data.url,
      cardReadingCount: data.cardReadingCount || 0,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting diary:', error);
    return null;
  }
};

export const validateDiaryAccess = async (
  diaryId: string,
  clientId: string
): Promise<boolean> => {
  try {
    const diary = await getDiary(diaryId);
    return diary?.clientId === clientId.trim();
  } catch (error) {
    console.error('Error validating diary access:', error);
    return false;
  }
};

export const getAllDiaries = async (): Promise<Diary[]> => {
  try {
    const diariesRef = collection(db, 'diaries');
    const q = query(diariesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      cardReadingCount: doc.data().cardReadingCount || 0,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Diary[];
  } catch (error) {
    console.error('Error getting all diaries:', error);
    throw new Error('Failed to get diaries');
  }
};

export const updateDiary = async (
  diaryId: string,
  updates: {
    clientId?: string;
    name?: string;
    gender?: 'Male' | 'Female' | 'Other';
  }
): Promise<void> => {
  try {
    const diariesRef = collection(db, 'diaries');
    const diaryQuery = query(diariesRef, where('id', '==', diaryId));
    const diarySnapshot = await getDocs(diaryQuery);
    
    if (!diarySnapshot.empty) {
      const diaryDoc = diarySnapshot.docs[0];
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (updates.clientId !== undefined) {
        updateData.clientId = updates.clientId.trim();
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }
      if (updates.gender !== undefined) {
        updateData.gender = updates.gender;
      }
      
      await updateDoc(diaryDoc.ref, updateData);
    } else {
      throw new Error('Diary not found');
    }
  } catch (error) {
    console.error('Error updating diary:', error);
    throw new Error('Failed to update diary');
  }
};

export const deleteDiary = async (diaryId: string): Promise<void> => {
  try {
    // First, delete all cards associated with this diary
    const cardsRef = collection(db, 'cards');
    const cardsQuery = query(cardsRef, where('diaryId', '==', diaryId));
    const cardsSnapshot = await getDocs(cardsQuery);
    
    // Delete all cards in batch
    const deletePromises = cardsSnapshot.docs.map(cardDoc => deleteDoc(cardDoc.ref));
    await Promise.all(deletePromises);
    
    // Then, delete the diary itself
    const diariesRef = collection(db, 'diaries');
    const diaryQuery = query(diariesRef, where('id', '==', diaryId));
    const diarySnapshot = await getDocs(diaryQuery);
    
    if (!diarySnapshot.empty) {
      await deleteDoc(diarySnapshot.docs[0].ref);
    }
  } catch (error) {
    console.error('Error deleting diary:', error);
    throw new Error('Failed to delete diary');
  }
};

export const incrementCardReadingCount = async (diaryId: string): Promise<void> => {
  try {
    const diariesRef = collection(db, 'diaries');
    const diaryQuery = query(diariesRef, where('id', '==', diaryId));
    const diarySnapshot = await getDocs(diaryQuery);
    
    if (!diarySnapshot.empty) {
      const diaryDoc = diarySnapshot.docs[0];
      const currentData = diaryDoc.data();
      const currentCount = currentData.cardReadingCount || 0;
      
      await updateDoc(diaryDoc.ref, {
        cardReadingCount: currentCount + 1,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error incrementing card reading count:', error);
    throw new Error('Failed to increment card reading count');
  }
};

// Card operations
export const createCard = async (
  diaryId: string,
  topic: string,
  bodyText: string = '',
  order: number
): Promise<string> => {
  try {
    const cardData = {
      id: `${diaryId}_${Date.now()}`,
      diaryId,
      topic: topic.trim(),
      bodyText: bodyText.trim(),
      order,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'cards'), cardData);
    return cardData.id;
  } catch (error) {
    console.error('Error creating card:', error);
    throw new Error('Failed to create card');
  }
};

export const getCards = async (diaryId: string): Promise<Card[]> => {
  try {
    const cardsRef = collection(db, 'cards');
    const q = query(
      cardsRef,
      where('diaryId', '==', diaryId),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        diaryId: data.diaryId,
        topic: data.topic,
        type: data.type,
        bodyText: data.bodyText,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting cards:', error);
    return [];
  }
};

export const updateCard = async (
  cardId: string,
  updates: Partial<Pick<Card, 'topic' | 'bodyText' | 'order'>>
): Promise<void> => {
  try {
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('id', '==', cardId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error updating card:', error);
    throw new Error('Failed to update card');
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('id', '==', cardId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error('Error deleting card:', error);
    throw new Error('Failed to delete card');
  }
};

export const duplicateCard = async (cardId: string): Promise<string> => {
  try {
    const cardsRef = collection(db, 'cards');
    
    // Get the original card
    const cardQuery = query(cardsRef, where('id', '==', cardId));
    const cardSnapshot = await getDocs(cardQuery);
    
    if (cardSnapshot.empty) {
      throw new Error('Card not found');
    }

    const originalCard = cardSnapshot.docs[0].data();
    const newCardId = `${originalCard.diaryId}_${Date.now()}`;
    
    // Get all cards for this diary to determine proper ordering
    const allCardsQuery = query(
      cardsRef,
      where('diaryId', '==', originalCard.diaryId),
      orderBy('order', 'asc')
    );
    const allCardsSnapshot = await getDocs(allCardsQuery);
    const allCards = allCardsSnapshot.docs.map(doc => doc.data());
    
    // Find the current card's position and the next card's order
    const currentCardOrder = originalCard.order;
    let nextCardOrder = currentCardOrder + 1; // Default if no next card
    
    // Find the next card after the current one
    for (const card of allCards) {
      if (card.order > currentCardOrder) {
        nextCardOrder = card.order;
        break;
      }
    }
    
    // Set new order between current and next card
    const newOrder = (currentCardOrder + nextCardOrder) / 2;
    
    const newCardData = {
      id: newCardId,
      diaryId: originalCard.diaryId,
      topic: `${originalCard.topic} (Copy)`,
      bodyText: originalCard.bodyText,
      order: newOrder, // Insert precisely between current and next card
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'cards'), newCardData);
    return newCardId;
  } catch (error) {
    console.error('Error duplicating card:', error);
    throw new Error('Failed to duplicate card');
  }
};

// Real-time listeners
export const subscribeToCards = (
  diaryId: string,
  callback: (cards: Card[]) => void
): (() => void) => {
  const cardsRef = collection(db, 'cards');
  const q = query(
    cardsRef,
    where('diaryId', '==', diaryId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const cards = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        diaryId: data.diaryId,
        topic: data.topic,
        type: data.type,
        bodyText: data.bodyText,
        order: data.order,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
    callback(cards);
  });
};
