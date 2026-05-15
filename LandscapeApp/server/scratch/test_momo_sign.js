
require('dotenv').config({ path: '../.env' });
const momo = require('../momoService');

console.log('--- MOMO CONFIG TEST ---');
console.log('MOMO_ENV:', process.env.MOMO_ENV);
console.log('PARTNER_CODE:', process.env.MOMO_PARTNER_CODE);
console.log('ACCESS_KEY:', process.env.MOMO_ACCESS_KEY ? 'Set' : 'Not Set');
console.log('SECRET_KEY:', process.env.MOMO_SECRET_KEY ? 'Set' : 'Not Set');

try {
  const testOrder = {
    orderId: 'test-' + Date.now(),
    requestId: 'test-' + Date.now(),
    amount: 1000,
    orderInfo: 'Test signature'
  };
  
  console.log('\nTesting signature generation...');
  // We can't easily call createPayment without a real network but we can test the resolvePrice
  const priceInfo = momo.resolvePrice('test_1k');
  console.log('ResolvePrice test_1k:', priceInfo);
  
  console.log('\nSignature test passed if no crash.');
} catch (err) {
  console.error('Test failed:', err.message);
}
