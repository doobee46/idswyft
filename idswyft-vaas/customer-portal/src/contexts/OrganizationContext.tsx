import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganizationBranding } from '../types';

interface OrganizationContextType {
  branding: OrganizationBranding | null;
  organizationName: string | null;
  isLoading: boolean;
  setBranding: (branding: OrganizationBranding | null) => void;
  setOrganizationName: (name: string | null) => void;
  applyBranding: () => void;
  removeBranding: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Apply branding to the document
  const applyBranding = () => {
    if (!branding) return;

    const root = document.documentElement;
    
    // Apply primary color variants as CSS custom properties
    if (branding.primary_color) {
      // Generate color variants from the primary color
      const colorVariants = generateColorVariants(branding.primary_color);
      
      // Apply all color variants
      root.style.setProperty('--org-primary-50', colorVariants[50]);
      root.style.setProperty('--org-primary-100', colorVariants[100]);
      root.style.setProperty('--org-primary-500', colorVariants[500]);
      root.style.setProperty('--org-primary-600', colorVariants[600]);
      root.style.setProperty('--org-primary-700', colorVariants[700]);
      root.style.setProperty('--org-primary-900', colorVariants[900]);
    }

    // Apply custom CSS if provided
    if (branding.custom_css) {
      let customStyleElement = document.getElementById('organization-custom-css');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'organization-custom-css';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = branding.custom_css;
    }

    // Set page title to include organization name
    if (branding.company_name) {
      document.title = `Identity Verification - ${branding.company_name}`;
    }
  };

  // Remove branding from the document
  const removeBranding = () => {
    const root = document.documentElement;
    root.style.removeProperty('--org-primary-50');
    root.style.removeProperty('--org-primary-100');
    root.style.removeProperty('--org-primary-500');
    root.style.removeProperty('--org-primary-600');
    root.style.removeProperty('--org-primary-700');
    root.style.removeProperty('--org-primary-900');

    // Remove custom CSS
    const customStyleElement = document.getElementById('organization-custom-css');
    if (customStyleElement) {
      customStyleElement.remove();
    }

    // Reset page title
    document.title = 'Identity Verification Portal';
  };

  // Apply branding when it changes
  useEffect(() => {
    if (branding) {
      applyBranding();
    } else {
      removeBranding();
    }

    // Cleanup on unmount
    return () => {
      removeBranding();
    };
  }, [branding]);

  // Set loading to false after initial setup
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const value: OrganizationContextType = {
    branding,
    organizationName,
    isLoading,
    setBranding,
    setOrganizationName,
    applyBranding,
    removeBranding,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

// Custom hook to use the organization context
export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

// Utility function to generate color variants from a primary color
function generateColorVariants(hex: string): Record<number, string> {
  // Remove # if present
  const normalizedHex = hex.replace('#', '');
  
  // Convert hex to RGB
  const num = parseInt(normalizedHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  
  // Convert RGB to HSL for better color manipulation
  const hsl = rgbToHsl(r, g, b);
  
  // Generate variants by adjusting lightness
  const variants: Record<number, string> = {
    50: hslToHex(hsl.h, Math.max(0, hsl.s - 0.1), Math.min(1, hsl.l + 0.4)),
    100: hslToHex(hsl.h, Math.max(0, hsl.s - 0.05), Math.min(1, hsl.l + 0.3)),
    500: hex, // Original color
    600: hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 0.1)),
    700: hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2)),
    900: hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 0.4))
  };
  
  return variants;
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h, s, l };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}