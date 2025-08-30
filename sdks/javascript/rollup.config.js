import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

const external = ['axios', 'form-data', 'crypto'];

export default [
  // ESM and CommonJS builds
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
    external,
  },
  // Type definitions
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
];