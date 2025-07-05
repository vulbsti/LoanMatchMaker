import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { UserConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  const config: UserConfig = {
    plugins: [
      react({
        // Include .jsx files
        include: /\.(jsx|tsx)$/,
      })
    ],
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@services': resolve(__dirname, './src/services'),
        '@types': resolve(__dirname, './src/types'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
      },
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // Development server configuration
    server: {
      port: 3000,
      host: true, // Allow external connections
      open: false, // Auto-open browser
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },

    // Preview server configuration
    preview: {
      port: 3000,
      host: true,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            api: ['axios'],
            ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          },
        },
      },
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
      },
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'axios',
        'lucide-react',
        'clsx',
        'tailwind-merge',
      ],
    },

    // CSS configuration
    css: {
      postcss: resolve(__dirname, './postcss.config.js'),
      devSourcemap: true,
    },

    // ESBuild configuration
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
  }

  // Development-specific configuration
  if (command === 'serve') {
    config.define = {
      ...config.define,
      __DEV__: true,
    }
  }

  // Production-specific configuration
  if (command === 'build') {
    config.define = {
      ...config.define,
      __DEV__: false,
    }
  }

  return config
})