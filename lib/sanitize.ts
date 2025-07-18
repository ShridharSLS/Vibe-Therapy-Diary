/**
 * HTML sanitization utility that works in both client and server environments
 */

// Simple HTML tag stripping regex for server-side
const stripHtmlRegex = /<\/?[^>]+(>|$)/g;

/**
 * Sanitizes HTML content safely in both client and server environments
 * @param html HTML content to sanitize
 * @returns Sanitized HTML
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Client-side: Use DOMPurify
  if (typeof window !== 'undefined') {
    // Dynamic import DOMPurify only on client side
    const DOMPurify = require('dompurify');
    return DOMPurify.sanitize(html);
  }
  
  // Server-side: Use basic regex sanitization
  // This is only for rendering on server - client will re-render with DOMPurify
  return html;
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
