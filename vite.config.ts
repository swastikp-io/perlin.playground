import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// Serial test files avoid a Windows sandbox transform-cache race while keeping
// the browser build configuration unchanged.
export default defineConfig({ plugins: [react()], test: { fileParallelism: false, isolate: false } });
