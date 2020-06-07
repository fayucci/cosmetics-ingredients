import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'web/index.js',
	output: {
		sourcemap: !production,
		format: "iife",
		name: 'app',
		file: 'static/index.js'
	},
	plugins: [
		svelte({
			dev: !production,
			css: css => { css.write('static/index.css'); }
		}),
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),
		production && terser(),
		copy({
			targets: [
				{ src: 'web/index.html', dest: 'static' },
			]
		})
	]
};

