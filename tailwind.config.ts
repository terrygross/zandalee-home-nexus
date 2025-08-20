
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// LCARS theme colors
				'lcars-orange': 'hsl(var(--lcars-orange))',
				'lcars-blue': 'hsl(var(--lcars-blue))',
				'lcars-red': 'hsl(var(--lcars-red))',
				'lcars-yellow': 'hsl(var(--lcars-yellow))',
				'lcars-purple': 'hsl(var(--lcars-purple))',
				'lcars-green': 'hsl(var(--lcars-green))',
				'lcars-pink': 'hsl(var(--lcars-pink))',
				
				'lcars-bg-primary': 'hsl(var(--lcars-bg-primary))',
				'lcars-bg-secondary': 'hsl(var(--lcars-bg-secondary))',
				'lcars-bg-tertiary': 'hsl(var(--lcars-bg-tertiary))',
				'lcars-bg-panel': 'hsl(var(--lcars-bg-panel))',
				
				'lcars-text-primary': 'hsl(var(--lcars-text-primary))',
				'lcars-text-secondary': 'hsl(var(--lcars-text-secondary))',
				'lcars-text-muted': 'hsl(var(--lcars-text-muted))',
				'lcars-text-accent': 'hsl(var(--lcars-text-accent))',
				
				// Standard shadcn colors mapped to LCARS
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'lcars-pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'lcars-pulse': 'lcars-pulse 2s ease-in-out infinite'
			},
			fontFamily: {
				'lcars': ['Orbitron', 'monospace'],
				'mono': ['Orbitron', 'JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
