/**
 * HTML sanitization utility that works in both client and server environments
 * Pure JavaScript implementation with no external dependencies
 */

// Allowed HTML tags for rich text editor - including nested list support
const ALLOWED_TAGS = ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'ul', 'ol', 'li'];

// Helper function to convert ReactQuill's flat structure to proper nested lists
const convertToNestedLists = (html: string): string => {
  if (typeof window === 'undefined') return html; // Skip on server-side
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process all lists in the document
  const lists = doc.querySelectorAll('ol, ul');
  
  lists.forEach(list => {
    const items = Array.from(list.children).filter(child => child.tagName === 'LI');
    const processedItems: Element[] = [];
    
    items.forEach(li => {
      const className = li.getAttribute('class') || '';
      const indentMatch = className.match(/ql-indent-(\d+)/);
      
      if (indentMatch) {
        const indentLevel = parseInt(indentMatch[1]);
        
        // Find the appropriate parent item
        let parentItem = null;
        for (let i = processedItems.length - 1; i >= 0; i--) {
          const prevItem = processedItems[i];
          const prevClassName = prevItem.getAttribute('class') || '';
          const prevIndentMatch = prevClassName.match(/ql-indent-(\d+)/);
          const prevIndentLevel = prevIndentMatch ? parseInt(prevIndentMatch[1]) : 0;
          
          if (prevIndentLevel < indentLevel) {
            parentItem = prevItem;
            break;
          }
        }
        
        if (parentItem) {
          // Create or find nested list in the parent item
          let nestedList = parentItem.querySelector('ol, ul');
          if (!nestedList) {
            // For nested lists, use 'ol' to get letter numbering (a, b, c)
            nestedList = doc.createElement('ol');
            parentItem.appendChild(nestedList);
          }
          
          // Remove indent class since it's now properly nested
          li.removeAttribute('class');
          if (li.getAttribute('class') === '') {
            li.removeAttribute('class');
          }
          
          // Move the item to the nested list
          nestedList.appendChild(li);
        } else {
          processedItems.push(li);
        }
      } else {
        processedItems.push(li);
      }
    });
  });
  
  return doc.body.innerHTML;
};

// Simple HTML tag stripping regex
const stripHtmlRegex = /<\/?[^>]+(>|$)/g;

/**
 * Basic HTML sanitizer that allows only specific tags
 * @param html HTML content to sanitize
 * @returns Sanitized HTML
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Client-side: Use DOM for better sanitization
  if (typeof window !== 'undefined') {
    // First convert flat indented lists to proper nested structure
    const nestedHtml = convertToNestedLists(html);
    const doc = new DOMParser().parseFromString(nestedHtml, 'text/html');
    const container = doc.createElement('div');
    
    // Extract and sanitize content from the parsed HTML
    const sanitizeNode = (node: Node, target: HTMLElement) => {
      if (node.nodeType === Node.TEXT_NODE) {
        target.appendChild(node.cloneNode(true));
        return;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        // Only allow specific tags
        if (ALLOWED_TAGS.includes(tagName)) {
          const newEl = doc.createElement(tagName);
          
          // Preserve all necessary attributes for nested lists
          const className = el.getAttribute('class');
          if (className) {
            const allowedClasses = className.split(' ').filter(cls => 
              cls.startsWith('ql-indent-') || cls.startsWith('ql-list-')
            );
            if (allowedClasses.length > 0) {
              newEl.setAttribute('class', allowedClasses.join(' '));
            }
          }
          
          // Preserve data-list attribute for list types (bullet, ordered, etc.)
          const dataList = el.getAttribute('data-list');
          if (dataList && (tagName === 'li')) {
            newEl.setAttribute('data-list', dataList);
          }
          
          // Preserve data-checked for checkboxes if needed
          const dataChecked = el.getAttribute('data-checked');
          if (dataChecked && (tagName === 'li')) {
            newEl.setAttribute('data-checked', dataChecked);
          }
          
          // Process child nodes recursively
          Array.from(el.childNodes).forEach(child => {
            sanitizeNode(child, newEl);
          });
          
          target.appendChild(newEl);
        } else {
          // For disallowed tags, just process their children
          Array.from(el.childNodes).forEach(child => {
            sanitizeNode(child, target);
          });
        }
      }
    };
    
    // Process the body content
    Array.from(doc.body.childNodes).forEach(node => {
      sanitizeNode(node, container);
    });
    
    return container.innerHTML;
  }
  
  // Server-side: Use a more robust regex approach that preserves list structures
  // This is a simplified version that works for basic sanitization
  // Client will re-sanitize with the DOM-based approach when rendered
  
  // First, preserve the structure of lists by ensuring proper nesting
  let sanitized = html;
  
  // Special handling for lists to ensure they're preserved
  const preserveLists = (html: string): string => {
    // We need to handle multiline content, so we'll use a different approach
    // First, extract and preserve all list structures
    
    // Helper function to extract content between tags
    const extractBetweenTags = (content: string, openTag: string, closeTag: string): string => {
      let result = content;
      let startIdx = result.indexOf(openTag);
      
      while (startIdx !== -1) {
        const endIdx = result.indexOf(closeTag, startIdx + openTag.length);
        if (endIdx === -1) break;
        
        // Get the full tag content
        const fullTag = result.substring(startIdx, endIdx + closeTag.length);
        // Create a clean version with just the tag name
        const cleanTag = `${openTag}${result.substring(startIdx + openTag.length, endIdx)}${closeTag}`;
        
        // Replace the original with the clean version
        result = result.substring(0, startIdx) + cleanTag + result.substring(endIdx + closeTag.length);
        
        // Find the next occurrence
        startIdx = result.indexOf(openTag, startIdx + cleanTag.length);
      }
      
      return result;
    };
    
    // Process in the correct order: list items first, then lists
    let result = html;
    
    // Clean list items first
    result = extractBetweenTags(result, '<li>', '</li>');
    result = extractBetweenTags(result, '<li ', '</li>');
    
    // Then clean lists
    result = extractBetweenTags(result, '<ul>', '</ul>');
    result = extractBetweenTags(result, '<ul ', '</ul>');
    result = extractBetweenTags(result, '<ol>', '</ol>');
    result = extractBetweenTags(result, '<ol ', '</ol>');
    
    return result;
  };
  
  sanitized = preserveLists(sanitized);
  
  // Then handle other allowed tags
  const tagPattern = /<\/?([a-z][a-z0-9]*)[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    if (ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      // For list-related tags, preserve them exactly
      if (['ul', 'ol', 'li'].includes(tagName.toLowerCase())) {
        return match.includes('/') ? `</${tagName}>` : `<${tagName}>`;
      }
      // For other tags, strip attributes but keep the tag
      return match.replace(/\s+[^>]*/, '');
    }
    return '';
  });
  
  return sanitized;
};

/**
 * Strips all HTML tags from content (for character counting)
 * @param html HTML content to strip tags from
 * @returns Plain text content
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  
  // Client-side: Use DOM
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
  
  // Server-side: Use regex
  return html.replace(stripHtmlRegex, '');
};
