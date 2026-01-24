/**
 * Dark Mode Testing Script
 * Run this in the browser console to test dark mode functionality
 * 
 * Usage: Copy and paste into browser console (F12)
 */

(function() {
  console.log('🧪 Dark Mode Testing Script Started\n');
  
  const tests = {
    passed: 0,
    failed: 0,
    results: []
  };

  function logTest(name, passed, message = '') {
    tests.results.push({ name, passed, message });
    if (passed) {
      tests.passed++;
      console.log(`✅ ${name}${message ? ': ' + message : ''}`);
    } else {
      tests.failed++;
      console.error(`❌ ${name}${message ? ': ' + message : ''}`);
    }
  }

  // Test 1: Check if localStorage is accessible
  console.log('\n📋 Test 1: localStorage Access');
  try {
    const settings = localStorage.getItem('bonzai_settings');
    logTest('localStorage accessible', true, settings ? 'Settings found' : 'No settings (new user)');
  } catch (e) {
    logTest('localStorage accessible', false, e.message);
  }

  // Test 2: Check if dark class can be applied
  console.log('\n📋 Test 2: Dark Class Application');
  const html = document.documentElement;
  const originalClasses = html.className;
  
  html.classList.add('dark');
  const hasDarkAfterAdd = html.classList.contains('dark');
  logTest('Can add dark class', hasDarkAfterAdd);
  
  html.classList.remove('dark');
  const hasDarkAfterRemove = !html.classList.contains('dark');
  logTest('Can remove dark class', hasDarkAfterRemove);
  
  // Restore original state
  html.className = originalClasses;

  // Test 3: Check current dark mode state
  console.log('\n📋 Test 3: Current State');
  const currentHasDark = html.classList.contains('dark');
  const currentSettings = localStorage.getItem('bonzai_settings');
  let parsedSettings = null;
  
  try {
    if (currentSettings) {
      parsedSettings = JSON.parse(currentSettings);
    }
  } catch (e) {
    logTest('Settings parsing', false, e.message);
  }
  
  logTest('HTML has dark class', currentHasDark, currentHasDark ? 'Dark mode active' : 'Light mode active');
  if (parsedSettings) {
    logTest('Settings found', true, `darkMode: ${parsedSettings.darkMode}`);
  } else {
    logTest('Settings found', false, 'No settings in localStorage');
  }

  // Test 4: Check applyDarkMode utility (if available)
  console.log('\n📋 Test 4: Utility Function Test');
  if (typeof window.applyDarkMode === 'function') {
    window.applyDarkMode(true);
    const testDark = html.classList.contains('dark');
    logTest('applyDarkMode(true) works', testDark);
    
    window.applyDarkMode(false);
    const testLight = !html.classList.contains('dark');
    logTest('applyDarkMode(false) works', testLight);
  } else {
    logTest('applyDarkMode available', false, 'Function not found in window scope');
  }

  // Test 5: Check system preference
  console.log('\n📋 Test 5: System Preference');
  if (window.matchMedia) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    logTest('System preference detected', true, prefersDark ? 'System prefers dark' : 'System prefers light');
  } else {
    logTest('System preference detected', false, 'matchMedia not available');
  }

  // Test 6: Check data attribute
  console.log('\n📋 Test 6: Data Attributes');
  const dataAttr = html.getAttribute('data-dark-mode-applied');
  logTest('Data attribute exists', dataAttr !== null, dataAttr ? `Value: ${dataAttr}` : 'Not set');

  // Test 7: Check CSS variables
  console.log('\n📋 Test 7: CSS Variables');
  const styles = getComputedStyle(html);
  const bgColor = styles.getPropertyValue('--background');
  logTest('CSS variables available', bgColor !== '', bgColor ? `Background: ${bgColor}` : 'Not found');

  // Test 8: Manual toggle test
  console.log('\n📋 Test 8: Manual Toggle');
  console.log('Testing manual toggle...');
  const beforeToggle = html.classList.contains('dark');
  html.classList.toggle('dark');
  const afterToggle = html.classList.contains('dark');
  const toggleWorked = beforeToggle !== afterToggle;
  logTest('Manual toggle works', toggleWorked);
  
  // Restore original state
  html.className = originalClasses;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log(`📈 Total: ${tests.passed + tests.failed}`);
  console.log(`\nSuccess Rate: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`);
  
  if (tests.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    tests.results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}${r.message ? ': ' + r.message : ''}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Open Settings page');
  console.log('   2. Click Dark button (Moon icon)');
  console.log('   3. Verify page switches to dark mode');
  console.log('   4. Check console for [SettingsContext] logs');
  console.log('   5. Reload page and verify persistence');
  
  return tests;
})();
