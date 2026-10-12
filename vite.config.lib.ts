import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// AURA component-library build. Copyright (c) 2026 Develofer2. MIT License.
// Library-mode config invoked via `pnpm run build:lib`; the app itself builds
// with vite.config.ts. Type declarations are emitted separately by
// `tsc -p tsconfig.types.json`.

// Runtime and peer dependencies stay external so the package does not bundle
// them; consumers provide their own React.
function readExternalDeps(): string[] {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
    return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]
  } catch {
    return ['react', 'react-dom']
  }
}

const externalDeps = readExternalDeps()
function isExternal(id: string): boolean {
  // Externalize each dep and its subpath imports (e.g. react, react/jsx-runtime).
  return externalDeps.some((dep) => id === dep || id.startsWith(dep + '/'))
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    lib: {
      entry: ['./src/index.ts'],
      formats: ['es'],
      cssFileName: 'style',
    },
    rollupOptions: {
      external: isExternal,
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
})
