
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['PT Sans', 'sans-serif'],
        headline: ['Poppins', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        'sky-blue': '#7EC8E3',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        header: {
          DEFAULT: 'hsl(var(--header-background))',
          foreground: 'hsl(var(--header-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'border-glow': {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
        'shine-button': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'shine-indefinitely': {
          '0%': { transform: 'translateX(-100%) skewX(-30deg)', opacity: '0'},
          '30%': { transform: 'translateX(100%) skewX(-30deg)', opacity: '1'},
          '100%': { transform: 'translateX(100%) skewX(-30deg)', opacity: '0'},
        },
        'float-1': {
          '0%, 25%, 100%': { transform: 'translateY(0)' },
          '12.5%': { transform: 'translateY(-10px)' },
        },
        'float-2': {
          '0%, 25%, 50%, 100%': { transform: 'translateY(0)' },
          '37.5%': { transform: 'translateY(-10px)' },
        },
        'float-3': {
          '0%, 50%, 75%, 100%': { transform: 'translateY(0)' },
          '62.5%': { transform: 'translateY(-10px)' },
        },
        'float-4': {
          '0%, 75%, 100%': { transform: 'translateY(0)' },
          '87.5%': { transform: 'translateY(-10px)' },
        },
        'border-pulse': {
          '0%, 100%': { 'border-color': 'hsl(var(--primary) / 0.5)' },
          '50%': { 'border-color': 'hsl(var(--primary))' },
        },
        'float-up': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'notification-float': {
            '0%, 100%': { transform: 'translateY(0) translateX(0)' },
            '25%': { transform: 'translateY(-3px) translateX(3px)' },
            '50%': { transform: 'translateY(0) translateX(6px)' },
            '75%': { transform: 'translateY(3px) translateX(3px)' },
        },
        'slide-right': {
            '0%, 100%': { transform: 'translateX(0)' },
            '50%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'blink': 'blink 1s step-end infinite',
        'border-glow': 'border-glow 4s linear infinite',
        'shine-button': 'shine-button 3s infinite',
        'shine-indefinitely': 'shine-indefinitely 3s infinite',
        'float-1': 'float-1 6s ease-in-out infinite',
        'float-2': 'float-2 6s ease-in-out infinite',
        'float-3': 'float-3 6s ease-in-out infinite',
        'float-4': 'float-4 6s ease-in-out infinite',
        'border-pulse': 'border-pulse 2s infinite',
        'float-up': 'float-up 1.5s ease-in-out infinite',
        'notification-float': 'notification-float 2s ease-in-out infinite',
        'slide-right': 'slide-right 1.5s ease-in-out infinite',
      },
      backgroundSize: {
        '400%': '400% 400%',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
