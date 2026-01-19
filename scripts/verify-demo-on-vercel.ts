/**
 * Script to verify demo account data on Vercel
 * Run with: npx tsx scripts/verify-demo-on-vercel.ts
 */

const VERCEL_URL = process.env.VERCEL_URL || 'https://bonzai-react-cd9fn4qs9-stu-coopers-projects.vercel.app';

async function verifyDemoOnVercel() {
  console.log('🔍 Verifying demo account on Vercel...\n');
  console.log(`📍 Vercel URL: ${VERCEL_URL}\n`);

  try {
    const diagnoseUrl = `${VERCEL_URL}/api/demo/diagnose`;
    console.log(`📡 Calling: ${diagnoseUrl}\n`);
    
    const response = await fetch(diagnoseUrl);
    
    if (!response.ok) {
      console.error(`❌ Request failed with status ${response.status}`);
      const text = await response.text();
      console.error(`Response: ${text}`);
      return;
    }

    const diagnostics = await response.json();
    
    console.log('📊 Diagnostic Results:\n');
    console.log(JSON.stringify(diagnostics, null, 2));
    
    if (diagnostics.selectedDemoAccount) {
      const accountData = diagnostics.demoAccountProperties[diagnostics.selectedDemoAccount.id];
      console.log(`\n✅ Selected Demo Account: ${diagnostics.selectedDemoAccount.name} (${diagnostics.selectedDemoAccount.email})`);
      console.log(`   Properties: ${accountData?.propertiesCount || 0}`);
      console.log(`   Mortgages: ${accountData?.mortgagesCount || 0}`);
      console.log(`   Expenses: ${accountData?.expensesCount || 0}`);
    } else {
      console.log('\n❌ No demo account found!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyDemoOnVercel();
