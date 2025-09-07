# Organization-Specific Customer Portal Customization

## Overview

The customer portal now supports complete organization-specific customization, allowing each organization to provide a branded verification experience for their users.

## Features Implemented

### 1. **Dynamic Color Branding**
- Primary color variants automatically generated from organization's primary color
- All UI elements (buttons, progress bars, status indicators) adapt to organization colors
- Fallback to default blue theme when no organization branding is provided

### 2. **Organization Logo Display**
- Custom logos displayed in header across all portal pages
- Automatic fallback to shield icon if logo fails to load or isn't provided
- Optimized image loading with proper error handling

### 3. **Customizable Messaging**
- **Welcome Message**: Organizations can customize the initial welcome text
- **Success Message**: Custom completion messages for successful verifications
- **Company Name**: Displayed prominently throughout the verification flow

### 4. **Custom CSS Support**
- Organizations can inject custom CSS for advanced styling
- Safely sandboxed custom styles to prevent conflicts
- Dynamic application and cleanup of custom styles

## Technical Architecture

### Organization Context (`/src/contexts/OrganizationContext.tsx`)
- Centralized branding state management
- Automatic CSS custom property injection
- Color variant generation using HSL manipulation
- Clean-up on component unmount

### Branded Header Component (`/src/components/BrandedHeader.tsx`)
- Reusable header component with organization logo and name
- Graceful fallback handling for missing logos
- Configurable subtitle support

### API Integration (`/src/services/api.ts`)
- Type-safe API client for customer portal
- Organization branding data fetched with verification session
- Proper error handling and logging

### Dynamic Styling System (`/src/index.css`)
- CSS custom properties for theme overrides
- Tailwind CSS integration with organization variables
- Fallback color system using CSS `var()` function

## Usage Example

When a user receives a verification invitation link from "Acme Corp":

1. **Session Token Contains Organization Context**
   ```
   /verify?session=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

2. **API Returns Organization Branding**
   ```json
   {
     "success": true,
     "data": {
       "id": "session-123",
       "organization_name": "Acme Corp",
       "organization_branding": {
         "company_name": "Acme Corporation",
         "logo_url": "https://cdn.acmecorp.com/logo.png",
         "primary_color": "#e11d48",
         "welcome_message": "Welcome! Please verify your identity to access your Acme account.",
         "success_message": "Thank you! Your identity has been verified. You can now access all Acme services."
       }
     }
   }
   ```

3. **Portal Automatically Applies Branding**
   - Logo appears in header
   - All primary colors change to `#e11d48` (rose-600)
   - Custom welcome and success messages are displayed
   - Page title becomes "Identity Verification - Acme Corporation"

## Organization Branding Interface

```typescript
interface OrganizationBranding {
  company_name: string;
  logo_url?: string;
  primary_color?: string;          // Hex color (e.g., "#e11d48")
  welcome_message: string;
  success_message: string;
  custom_css?: string;             // Advanced custom styling
}
```

## Color System

The system automatically generates color variants from the primary color:

- **50**: Very light tint (backgrounds, subtle highlights)
- **100**: Light tint (hover states, borders)
- **500**: Original color (main elements)
- **600**: Slightly darker (buttons, primary actions)
- **700**: Darker (hover states, focus states)
- **900**: Very dark (text, high contrast elements)

## Browser Compatibility

- Modern browsers with CSS custom property support
- Graceful degradation to default theme in older browsers
- React 19 with TypeScript for type safety

## Security Considerations

- Custom CSS is injected safely without XSS risks
- Organization data is validated before rendering
- Logo URLs are properly escaped and handled
- No sensitive data exposed in client-side code

## Testing

The implementation has been tested with:
- ✅ Successful build compilation
- ✅ TypeScript type checking
- ✅ Component integration
- ✅ CSS custom property injection
- ✅ Error handling and fallbacks

## Next Steps

To fully activate this system, ensure:

1. **Backend API Integration**: Verification session endpoints return organization branding data
2. **Database Schema**: Organization tables include branding configuration fields  
3. **Admin Dashboard**: Organizations can configure their branding through the VaaS admin interface
4. **Testing**: End-to-end testing with actual organization data

The customer portal is now ready to provide fully customized, organization-specific verification experiences!