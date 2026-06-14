/**
 * Centralized environment configuration for frontend
 * All environment-dependent values should be accessed through this file
 */

// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// OAuth URLs (dynamically constructed from API_URL)
export const GOOGLE_AUTH_URL = `${API_URL}/auth/google`;

// Brand Assets
export const BRAND_LOGO_URL = import.meta.env.VITE_BRAND_LOGO_URL || 'https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png';

// Helper function to get full image URL
export const getImageUrl = (path: string | undefined): string | null => {
  if (!path) return null;
  
  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Data URL or blob
  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // Relative path - convert to absolute using API_URL base
  if (path.startsWith('/')) {
    // Remove /api/v1 from API_URL to get base URL
    const baseUrl = API_URL.replace(/\/api\/v1$/, '');
    return `${baseUrl}${path}`;
  }
  
  return path;
};

// Export config object for easy import
export const config = {
  apiUrl: API_URL,
  googleAuthUrl: GOOGLE_AUTH_URL,
  brandLogoUrl: BRAND_LOGO_URL,
  getImageUrl,
};

export default config;
