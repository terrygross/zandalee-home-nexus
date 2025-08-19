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
				// Zandalee space theme
				'space-void': 'hsl(var(--space-void))',
				'space-deep': 'hsl(var(--space-deep))',
				'space-mid': 'hsl(var(--space-mid))',
				'space-surface': 'hsl(var(--space-surface))',
				
				// Energy colors
				'energy-cyan': 'hsl(var(--energy-cyan))',
				'energy-blue': 'hsl(var(--energy-blue))',
				'energy-pulse': 'hsl(var(--energy-pulse))',
				'energy-glow': 'hsl(var(--energy-glow))',
				
				// Text colors
				'text-primary': 'hsl(var(--text-primary))',
				'text-secondary': 'hsl(var(--text-secondary))',
				'text-muted': 'hsl(var(--text-muted))',
				'text-accent': 'hsl(var(--text-accent))',
				
				// Status colors
				'status-success': 'hsl(var(--status-success))',
				'status-warning': 'hsl(var(--status-warning))',
				'status-error': 'hsl(var(--status-error))',
				'status-info': 'hsl(var(--status-info))',
				
				// Glass morphism
				'glass-bg': 'hsl(var(--glass-bg))',
				'glass-border': 'hsl(var(--glass-border))',

				// LCARS Colors
				'lcars-black': 'hsl(var(--lcars-black))',
				'lcars-dark-gray': 'hsl(var(--lcars-dark-gray))',
				'lcars-medium-gray': 'hsl(var(--lcars-medium-gray))',
				'lcars-light-gray': 'hsl(var(--lcars-light-gray))',
				'lcars-orange': 'hsl(var(--lcars-orange))',
				'lcars-peach': 'hsl(var(--lcars-peach))',
				'lcars-red': 'hsl(var(--lcars-red))',
				'lcars-rose': 'hsl(var(--lcars-rose))',
				'lcars-magenta': 'hsl(var(--lcars-magenta))',
				'lcars-violet': 'hsl(var(--lcars-violet))',
				'lcars-purple': 'hsl(var(--lcars-purple))',
				'lcars-indigo': 'hsl(var(--lcars-indigo))',
				'lcars-blue': 'hsl(var(--lcars-blue))',
				'lcars-sky': 'hsl(var(--lcars-sky))',
				'lcars-teal': 'hsl(var(--lcars-teal))',
				'lcars-mint': 'hsl(var(--lcars-mint))',
				'lcars-amber': 'hsl(var(--lcars-amber))',
				'lcars-golden': 'hsl(var(--lcars-golden))',
				
				// Standard shadcn colors
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
			fontFamily: {
				'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
				'lcars-sans': ['Michroma', 'Share Tech Mono', 'sans-serif'],
				'lcars-mono': ['Orbitron', 'monospace'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'lcars': '2rem',
				'lcars-sm': '1rem',
				'lcars-elbow': '3rem',
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
				'energy-pulse': {
					'0%': { opacity: '0.3', transform: 'scale(1)' },
					'100%': { opacity: '0.8', transform: 'scale(1.05)' }
				},
				'voice-pulse': {
					'0%, 100%': { boxShadow: '0 0 10px hsl(var(--energy-cyan) / 0.3)' },
					'50%': { boxShadow: '0 0 20px hsl(var(--energy-cyan) / 0.6), 0 0 30px hsl(var(--energy-pulse) / 0.4)' }
				},
				'data-flow': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'50%': { opacity: '1' },
					'100%': { transform: 'translateX(100%)', opacity: '0' }
				},
				'marquee': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(-100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'energy-pulse': 'energy-pulse 2s ease-in-out infinite alternate',
				'voice-pulse': 'voice-pulse 1s ease-in-out infinite',
				'data-flow': 'data-flow 3s ease-in-out infinite',
				'marquee': 'marquee 30s linear infinite'
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
