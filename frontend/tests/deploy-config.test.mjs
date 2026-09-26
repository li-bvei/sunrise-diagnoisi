import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const bundled = await build({
  entryPoints: [resolve('vite.base-path.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})
const { resolveBasePath, DEFAULT_PRODUCTION_BASE } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
)

test('an unset/blank VITE_BASE_PATH keeps the live defaults: /server/ in production, / in development', () => {
  // The live site is https://www.sunrise-nskt.com/server/. If this default ever changes, the next
  // deploy on a server without a root .env silently emits /assets/... and white-screens the site.
  assert.equal(DEFAULT_PRODUCTION_BASE, '/server/')
  for (const blank of [undefined, '', '   ']) {
    assert.equal(resolveBasePath(blank, true), '/server/')
    assert.equal(resolveBasePath(blank, false), '/')
  }
})

test('VITE_BASE_PATH overrides the default and is normalised to /segment/ form', () => {
  assert.equal(resolveBasePath('/', true), '/')
  assert.equal(resolveBasePath('/server/', true), '/server/')
  assert.equal(resolveBasePath('/server', true), '/server/')
  assert.equal(resolveBasePath('  /app/v2  ', true), '/app/v2/')
  assert.equal(resolveBasePath('/a//b/', false), '/a/b/')
  // an explicit value wins in development too
  assert.equal(resolveBasePath('/dev/', false), '/dev/')
})

test('a malformed VITE_BASE_PATH fails the build loudly instead of shipping a white-screen bundle', () => {
  for (const bad of ['server', './', '../x', '/a/../b', '//cdn.example.com/', 'https://example.com/app/', '/with space/', '/bad?q=1']) {
    assert.throws(() => resolveBasePath(bad, true), /VITE_BASE_PATH must be an absolute path/, bad)
  }
})

test('vite, Docker and compose agree on one default, and the router follows Vite base', () => {
  const viteConfig = read('../vite.config.ts')
  const dockerfile = read('../Dockerfile')
  const compose = read('../../docker-compose.yml')
  const router = read('../src/router/index.ts')

  // vite.config reads the variable (process.env + .env files) through the tested helper, no literal base
  assert.match(viteConfig, /loadEnv\(mode, process\.cwd\(\), ''\)/)
  assert.match(viteConfig, /resolveBasePath\(env\.VITE_BASE_PATH, mode === 'production'\)/)
  assert.doesNotMatch(viteConfig, /base:\s*mode === 'production' \? '\/server\/'/)

  // "no variable set" is /server/ everywhere, so Docker/compose cannot override the default with "/"
  assert.match(dockerfile, /^ARG VITE_BASE_PATH=\/server\/$/m)
  assert.match(compose, /VITE_BASE_PATH: \$\{VITE_BASE_PATH:-\/server\/\}/)

  // the router must keep following Vite's base (never a hardcoded prefix)
  assert.match(router, /createWebHistory\(import\.meta\.env\.BASE_URL\)/)
  assert.doesNotMatch(router, /['"`]\/server\//)
})
