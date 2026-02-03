/**
 * Test script for DNS service
 * Run: node test-dns.js
 */

require('dotenv').config();
const { createDNSRecord, deleteDNSRecord, checkDNSRecord, generateSubdomain, DOMAIN } = require('./services/dns');

async function test() {
  console.log('=== DNS Service Test ===\n');
  
  // Test subdomain generation
  console.log('1. Testing subdomain generation:');
  const subdomain1 = generateSubdomain('My-Cool-App', 20);
  console.log(`   "My-Cool-App" + user 20 => ${subdomain1}`);
  
  const subdomain2 = generateSubdomain('React Test Deploy!!!', 5);
  console.log(`   "React Test Deploy!!!" + user 5 => ${subdomain2}`);
  
  // Use a test subdomain
  const testSubdomain = `test-${Date.now()}`;
  const testIP = '104.248.1.103'; // Example IP
  
  console.log(`\n2. Creating DNS record: ${testSubdomain}.${DOMAIN} -> ${testIP}`);
  const createResult = await createDNSRecord(testSubdomain, testIP);
  console.log('   Result:', createResult);
  
  if (!createResult.success) {
    console.log('\n❌ Failed to create DNS record. Check your DO_API_TOKEN.');
    return;
  }
  
  console.log(`\n3. Checking if DNS record exists...`);
  const checkResult = await checkDNSRecord(testSubdomain);
  console.log('   Result:', checkResult);
  
  console.log(`\n4. Deleting DNS record...`);
  const deleteResult = await deleteDNSRecord(testSubdomain);
  console.log('   Result:', deleteResult);
  
  console.log(`\n5. Verifying deletion...`);
  const verifyResult = await checkDNSRecord(testSubdomain);
  console.log('   Result:', verifyResult);
  
  console.log('\n=== Test Complete ===');
  console.log(verifyResult.exists ? '❌ Record still exists!' : '✅ All tests passed!');
}

test().catch(console.error);
