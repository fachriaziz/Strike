// @ts-check
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	server: { host: '127.0.0.1' },
	security: {
		allowedDomains: [
			{ protocol: 'http', hostname: '127.0.0.1' },
			{ protocol: 'http', hostname: 'localhost' },
		],
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			fs: {
				deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.data/**', '**/*.sqlite*'],
			},
		},
	},
});
