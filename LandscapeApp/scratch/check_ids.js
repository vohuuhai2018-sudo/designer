const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function check() {
  try {
    const res = await fetch('http://localhost:5000/api/projects');
    const data = await res.json();
    console.log('Total:', data.length);
    if (data.length > 0) {
      console.log('First Project Selections:', JSON.stringify(data[0].selections, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}
check();
