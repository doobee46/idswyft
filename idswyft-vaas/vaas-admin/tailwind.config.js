// Tailwind CSS v4 configuration
export default {
  // Tailwind v4 uses CSS-based configuration in the @import statement
  // Most configuration is now done through CSS custom properties
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

