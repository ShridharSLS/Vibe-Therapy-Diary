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
  
  // Server-side: Use regex-based approach
  // This is a simplified version that works for basic sanitization
  // Client will re-sanitize with the DOM-based approach
  let sanitized = html;
  
  // Remove all tags except allowed ones
  const tagPattern = /<\/?([a-z][a-z0-9]*)[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    if (ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      // Keep only the tag name and remove attributes
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
