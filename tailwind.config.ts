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
				},
				// Neo-Brutalist specific colors
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'none': '0'
			},
			borderWidth: {
				'brutal': 'var(--border-width)'
			},
			boxShadow: {
				'brutal': 'var(--shadow-brutal) hsl(var(--foreground))',
				'brutal-lg': 'var(--shadow-brutal-lg) hsl(var(--foreground))',
				'brutal-xl': 'var(--shadow-brutal-xl) hsl(var(--foreground))',
				'brutal-accent': 'var(--shadow-brutal) hsl(var(--accent))',
				'brutal-secondary': 'var(--shadow-brutal) hsl(var(--secondary))',
				'brutal-destructive': 'var(--shadow-brutal) hsl(var(--destructive))',
				'brutal-success': 'var(--shadow-brutal) hsl(var(--success))'
			},
			fontFamily: {
				'brutal': ['Space Grotesk', 'sans-serif'],
				'mono': ['JetBrains Mono', 'monospace']
			},
			letterSpacing: {
				'brutal': '-0.02em'
			},
			animation: {
				'brutal-bounce': 'brutal-bounce 0.3s ease-in-out',
				'brutal-shake': 'brutal-shake 0.5s ease-in-out'
			},
			keyframes: {
				'brutal-bounce': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'50%': { transform: 'translate(-4px, -4px)' }
				},
				'brutal-shake': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'25%': { transform: 'translate(-2px, 2px)' },
					'75%': { transform: 'translate(2px, -2px)' }
				}
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
