export interface Diary {
  id: string;
  clientId: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  diaryId: string;
  topic: string;
  bodyText: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  isAuthenticated: boolean;
  passwordHash?: string;
}

export type Gender = 'Male' | 'Female' | 'Other';
