import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'oklch(var(--background) / <alpha-value>)',
  			foreground: 'oklch(var(--foreground) / <alpha-value>)',
  			card: {
  				DEFAULT: 'oklch(var(--card) / <alpha-value>)',
  				foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
  				foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
  				foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
  				foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
  				foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
  				foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
  				foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
  			},
  			success: 'oklch(var(--success) / <alpha-value>)',
  			warning: 'oklch(var(--warning) / <alpha-value>)',
  			info: 'oklch(var(--info) / <alpha-value>)',
  			danger: 'oklch(var(--danger) / <alpha-value>)',
  			sidebar: {
  				DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
  				foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)'
  			},
  			status: {
  				new: 'oklch(var(--status-new) / <alpha-value>)',
  				to_contact: 'oklch(var(--status-to_contact) / <alpha-value>)',
  				shortlisted: 'oklch(var(--status-shortlisted) / <alpha-value>)',
  				interview: 'oklch(var(--status-interview) / <alpha-value>)',
  				offer: 'oklch(var(--status-offer) / <alpha-value>)',
  				hired: 'oklch(var(--status-hired) / <alpha-value>)',
  				rejected: 'oklch(var(--status-rejected) / <alpha-value>)'
  			},
  			brand: {
  				DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
  				foreground: 'rgb(var(--brand-foreground) / <alpha-value>)'
  			},
  			border: 'oklch(var(--border) / <alpha-value>)',
  			input: 'oklch(var(--input) / <alpha-value>)',
  			ring: 'oklch(var(--ring) / <alpha-value>)',
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
  		},
  		fontSize: {
  			title: ['var(--text-title)', { lineHeight: '1.25', letterSpacing: '-0.03em', fontWeight: '700' }],
  			heading: ['var(--text-heading)', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
  			caption: ['var(--text-caption)', { lineHeight: '1.4' }]
  		},
  		boxShadow: {
  			card: 'var(--shadow-card)',
  			pop: 'var(--shadow-pop)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
