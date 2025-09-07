import React from 'react';
import { Shield } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

interface BrandedHeaderProps {
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
}

const BrandedHeader: React.FC<BrandedHeaderProps> = ({ 
  showSubtitle = true, 
  subtitle = "Identity Verification",
  className = "" 
}) => {
  const { branding, organizationName } = useOrganization();

  const companyName = branding?.company_name || organizationName || 'Verification Portal';
  const logoUrl = branding?.logo_url;

  return (
    <div className={`text-center ${className}`}>
      {/* Logo */}
      <div className="flex justify-center mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            className="h-12 max-w-full object-contain"
            onError={(e) => {
              // Fallback to default shield icon if logo fails to load
              console.warn('Failed to load organization logo:', logoUrl);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show fallback icon
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}
        
        {/* Fallback icon - shown if no logo or logo fails to load */}
        <div 
          className={`w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center ${logoUrl ? 'hidden' : 'flex'}`}
          style={{ display: logoUrl ? 'none' : 'flex' }}
        >
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Company Name */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {companyName}
      </h1>

      {/* Subtitle */}
      {showSubtitle && (
        <p className="text-gray-600 text-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default BrandedHeader;