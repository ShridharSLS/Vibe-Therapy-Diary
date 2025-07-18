/**
 * HTML sanitization utility that works in both client and server environments
 * Pure JavaScript implementation with no external dependencies
 */

// Allowed HTML tags for rich text editor
const ALLOWED_TAGS = ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'ul', 'ol', 'li'];

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
    const doc = new DOMParser().parseFromString(html, 'text/html');
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
