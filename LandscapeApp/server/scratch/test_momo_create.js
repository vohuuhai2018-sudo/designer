
require('dotenv').config({ path: '../.env' });
const momo = require('../momoService');

async function testCreate() {
  const projectId = 'mp47zh354z61uptk76m';
  const packageId = 'test_1k';
  
  console.log(`Creating MoMo payment for project ${projectId}, package ${packageId}...`);
  try {
    const result = await momo.createPayment({
      orderId: `test-${projectId}-${Date.now()}`,
      requestId: `test-${projectId}-${Date.now()}`,
      amount: 1000,
      orderInfo: `Test Designer - Project ${projectId}`,
      extraData: Buffer.from(JSON.stringify({ projectId, packageId })).toString('base64')
    });
    
    console.log('\nSUCCESS!');
    console.log('Pay URL:', result.payUrl);
    console.log('QR Code URL:', result.qrCodeUrl);
  } catch (err) {
    console.error('\nFAILED!');
    console.error('Error:', err.message);
    if (err.momoResponse) {
      console.error('MoMo Response:', JSON.stringify(err.momoResponse, null, 2));
    }
  }
}

testCreate();
