#!/usr/bin/env node
/**
 * Smoke Test Script
 * Run before every deploy to catch obvious breakage
 * 
 * Usage: node smoke-test.js [url]
 * Default: https://cloudedbasement.ca
 * Local:   node smoke-test.js http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'https://cloudedbasement.ca';

const tests = [];
let passed = 0;
let failed = 0;

function log(status, message) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${icon} ${message}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    log('PASS', name);
  } catch (err) {
    failed++;
    log('FAIL', `${name}: ${err.message}`);
  }
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'manual' // Don't follow redirects automatically
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function runTests() {
  console.log(`\n🔥 SMOKE TEST: ${BASE_URL}\n`);
  console.log('=' .repeat(50));
  
  // ===== PUBLIC PAGES (should return 200) =====
  console.log('\n📄 Public Pages:\n');
  
  const publicPages = [
    '/',
    '/about',
    '/pricing',
    '/contact',
    '/docs',
    '/faq',
    '/terms',
    '/privacy',
    '/login',
    '/register',
    '/is-this-safe'
  ];
  
  for (const path of publicPages) {
    await test(`GET ${path} returns 200`, async () => {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
    });
  }
  
  // ===== HEALTH CHECK =====
  console.log('\n💓 Health Check:\n');
  
  await test('GET /health returns OK with database connected', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/health`);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(`Health status: ${data.status}`);
    }
    if (data.database !== 'connected') {
      throw new Error(`Database: ${data.database}`);
    }
  });
  
  // ===== PROTECTED ROUTES (should redirect to login, not error) =====
  console.log('\n🔒 Protected Routes (should redirect to /login):\n');
  
  const protectedRoutes = [
    '/dashboard',
    '/getting-started',
    '/admin',
    '/pay'
  ];
  
  for (const path of protectedRoutes) {
    await test(`GET ${path} redirects to login (not error)`, async () => {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`);
      // Should be 302/303 redirect to /login, or if followed, should be at login page
      if (res.status >= 400) {
        throw new Error(`Expected redirect, got ${res.status}`);
      }
      const location = res.headers.get('location') || '';
      if (res.status >= 300 && res.status < 400) {
        if (!location.includes('/login')) {
          throw new Error(`Redirects to ${location}, not /login`);
        }
      }
    });
  }
  
  // ===== CSRF TOKENS PRESENT =====
  console.log('\n🛡️ CSRF Protection:\n');
  
  const formsWithCSRF = [
    { path: '/login', name: 'Login form' },
    { path: '/register', name: 'Register form' },
    { path: '/contact', name: 'Contact form' }
  ];
  
  for (const { path, name } of formsWithCSRF) {
    await test(`${name} has CSRF token`, async () => {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`);
      const html = await res.text();
      if (!html.includes('name="_csrf"') && !html.includes("name='_csrf'")) {
        throw new Error('No _csrf input found in form');
      }
    });
  }
  
  // ===== STATIC ASSETS =====
  console.log('\n📦 Static Assets:\n');
  
  const assets = [
    '/css/global.css',
    '/css/tailwind.css',
    '/js/nav.js'
  ];
  
  for (const path of assets) {
    await test(`GET ${path} returns 200`, async () => {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
    });
  }
  
  // ===== CONTENT CHECKS =====
  console.log('\n📝 Content Checks:\n');
  
  await test('Homepage has pricing info', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/`);
    const html = await res.text();
    if (!html.includes('$15') && !html.includes('Basic')) {
      throw new Error('Pricing not found on homepage');
    }
  });
  
  await test('Pricing page has all 3 plans', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/pricing`);
    const html = await res.text();
    const hasBasic = html.includes('Basic') || html.includes('$15');
    const hasPro = html.includes('Pro') || html.includes('$35');
    const hasPremium = html.includes('Premium') || html.includes('$75');
    if (!hasBasic || !hasPro || !hasPremium) {
      throw new Error('Missing pricing plans');
    }
  });
  
  await test('No error stack traces in public pages', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/`);
    const html = await res.text();
    // Check for common error patterns that shouldn't be visible
    if (html.includes('at Object.') || html.includes('at Module.') || html.includes('node_modules')) {
      throw new Error('Stack trace found in HTML');
    }
  });
  
  // ===== SECURITY HEADERS =====
  console.log('\n🔐 Security Headers:\n');
  
  await test('Has security headers (Helmet)', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/`);
    const headers = res.headers;
    
    const checks = [];
    if (!headers.get('x-content-type-options')) checks.push('x-content-type-options');
    if (!headers.get('x-frame-options')) checks.push('x-frame-options');
    
    if (checks.length > 0) {
      throw new Error(`Missing headers: ${checks.join(', ')}`);
    }
  });
  
  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('❌ SMOKE TEST FAILED - DO NOT DEPLOY\n');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED - Safe to deploy\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
