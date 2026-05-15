
require('dotenv').config({ path: '../.env' });
const flow = require('../flowAutomation');

async function checkPool() {
  const status = flow.getPoolStatus();
  console.log('--- FLOW POOL STATUS ---');
  console.log(JSON.stringify(status, null, 2));
}

checkPool();
