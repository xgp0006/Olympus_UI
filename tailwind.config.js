/** @type {import('tailwindcss').Config} */
export default {
  // JIT mode is enabled by default in Tailwind CSS 3.x
  // Explicitly configure content for optimal JIT performance
  content: ['./src/**/*.{html,js,svelte,ts}', './src/app.html', './static/**/*.html'],

  // Enable JIT mode optimizations
  mode: 'jit',

  // Optimize for production builds
  future: {
    hoverOnlyWhenSupported: true
  },

  theme: {
    extend: {
      colors: {
        // Theme colors will be defined via CSS custom properties
        // These are fallback values for development
        'background-primary': 'var(--color-background_primary, #000000)',
        'background-secondary': 'var(--color-background_secondary, #111111)',
        'background-tertiary': 'var(--color-background_tertiary, #1a1a1a)',
        'text-primary': 'var(--color-text_primary, #ffffff)',
        'text-secondary': 'var(--color-text_secondary, #cccccc)',
        'text-disabled': 'var(--color-text_disabled, #666666)',
        'accent-blue': 'var(--color-accent_blue, #00aaff)',
        'accent-green': 'var(--color-accent_green, #00ff88)',
        'accent-red': 'var(--color-accent_red, #ff4444)',
        'accent-yellow': 'var(--color-accent_yellow, #ffaa00)',
        'accent-purple': 'var(--color-accent_purple, #aa44ff)',
        'border-primary': 'var(--color-border_primary, #333333)',
        'border-secondary': 'var(--color-border_secondary, #555555)'
      },
      spacing: {
        unit: 'var(--layout-spacing_unit, 1rem)',
        'unit-half': 'var(--layout-spacing_unit_half, 0.5rem)',
        'unit-double': 'var(--layout-spacing_unit_double, 2rem)'
      },
      borderRadius: {
        theme: 'var(--layout-border_radius, 0.375rem)'
      },
      fontFamily: {
        mono: 'var(--typography-font_family_mono, "JetBrains Mono", "Fira Code", "Consolas", monospace)',
        sans: 'var(--typography-font_family_sans, system-ui, -apple-system, sans-serif)'
      },
      fontSize: {
        xs: 'var(--typography-font_size_xs, 0.75rem)',
        sm: 'var(--typography-font_size_sm, 0.875rem)',
        base: 'var(--typography-font_size_base, 1rem)',
        lg: 'var(--typography-font_size_lg, 1.125rem)',
        xl: 'var(--typography-font_size_xl, 1.25rem)',
        '2xl': 'var(--typography-font_size_2xl, 1.5rem)'
      },

      // Aerospace-specific animations and transitions
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        glow: 'glow 2s ease-in-out infinite alternate'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px var(--color-accent_blue, #00aaff)' },
          '100%': {
            boxShadow:
              '0 0 20px var(--color-accent_blue, #00aaff), 0 0 30px var(--color-accent_blue, #00aaff)'
          }
        }
      },

      // Grid system for aerospace layouts
      gridTemplateColumns: {
        dashboard: 'repeat(auto-fit, minmax(300px, 1fr))',
        'mission-layout': '1fr 350px',
        'sdr-layout': '1fr 1fr'
      },

      // Z-index scale for layering
      zIndex: {
        modal: '1000',
        dropdown: '100',
        sticky: '50',
        overlay: '40',
        header: '30',
        sidebar: '20',
        base: '1'
      }
    }
  },

  // Optimize for aerospace interface requirements
  corePlugins: {
    // Disable unused features for better performance
    container: false
  },

  plugins: [
    require('@tailwindcss/typography'),

    // Custom plugin for aerospace-specific utilities
    function ({ addUtilities, theme }) {
      const newUtilities = {
        '.glass-effect': {
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'background-color': 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        '.mission-critical': {
          border: '2px solid var(--color-accent_red, #ff4444)',
          'box-shadow': '0 0 10px rgba(255, 68, 68, 0.3)'
        },
        '.status-active': {
          'border-left': '4px solid var(--color-accent_green, #00ff88)',
          'background-color': 'rgba(0, 255, 136, 0.1)'
        },
        '.status-warning': {
          'border-left': '4px solid var(--color-accent_yellow, #ffaa00)',
          'background-color': 'rgba(255, 170, 0, 0.1)'
        },
        '.status-error': {
          'border-left': '4px solid var(--color-accent_red, #ff4444)',
          'background-color': 'rgba(255, 68, 68, 0.1)'
        },
        '.hex-clip': {
          'clip-path': 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        }
      };

      addUtilities(newUtilities);
    }
  ]
};
