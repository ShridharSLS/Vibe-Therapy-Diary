import { BeforeItem, AfterItem } from './types';

export interface ParsedBeforeAfterData {
  beforeItems: Array<{
    title: string;
    afterItems: string[];
  }>;
}

/**
 * Parse bullet list content into structured before/after items
 */
export function parseBulletListContent(content: string): ParsedBeforeAfterData {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const result: ParsedBeforeAfterData = { beforeItems: [] };
  
  let currentBeforeItem: { title: string; afterItems: string[] } | null = null;
  
  for (const line of lines) {
    // Check if it's a numbered before item (1. 2. 3. etc.)
    const beforeItemMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (beforeItemMatch) {
      // Save previous before item if exists
      if (currentBeforeItem) {
        result.beforeItems.push(currentBeforeItem);
      }
      
      // Start new before item
      currentBeforeItem = {
        title: beforeItemMatch[2].trim(),
        afterItems: []
      };
      continue;
    }
    
    // Check if it's an indented after item (a. b. c. etc.)
    const afterItemMatch = line.match(/^[a-z]\.\s+(.+)$/);
    if (afterItemMatch && currentBeforeItem) {
      currentBeforeItem.afterItems.push(afterItemMatch[1].trim());
      continue;
    }
  }
  
  // Don't forget the last before item
  if (currentBeforeItem) {
    result.beforeItems.push(currentBeforeItem);
  }
  
  return result;
}

/**
 * Convert database before/after items back to bullet list format
 */
export function formatBeforeAfterToContent(beforeItems: BeforeItem[], afterItemsMap: Map<string, AfterItem[]>): string {
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
}

/**
 * Validate that the content follows the correct format
 */
export function validateBulletListContent(content: string): { isValid: boolean; errors: string[] } {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const errors: string[] = [];
  let hasBeforeItems = false;
  let currentBeforeItemExists = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for before items
    const beforeItemMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (beforeItemMatch) {
      hasBeforeItems = true;
      currentBeforeItemExists = true;
      
      if (!beforeItemMatch[2].trim()) {
        errors.push(`Line ${i + 1}: Before item cannot be empty`);
      }
      continue;
    }
    
    // Check for after items
    const afterItemMatch = line.match(/^[a-z]\.\s+(.+)$/);
    if (afterItemMatch) {
      if (!currentBeforeItemExists) {
        errors.push(`Line ${i + 1}: After item found without a parent before item`);
      }
      
      if (!afterItemMatch[1].trim()) {
        errors.push(`Line ${i + 1}: After item cannot be empty`);
      }
      continue;
    }
    
    // If we reach here, the line doesn't match expected format
    errors.push(`Line ${i + 1}: Invalid format. Expected numbered items (1. 2. 3.) or lettered sub-items (a. b. c.)`);
  }
  
  if (!hasBeforeItems && lines.length > 0) {
    errors.push('At least one before item is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
