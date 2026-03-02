const http = require('http');

async function testPersistence() {
  const loginData = JSON.stringify({
    password: 'Br1tt@nyDev2024!'
  });

  console.log('--- 1. Testing Login ---');
  const loginRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (res) => {
      let data = '';
      const cookie = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, cookie, data }));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('Login Status:', loginRes.status);
  console.log('Cookie received:', loginRes.cookie ? 'YES' : 'NO');

  if (!loginRes.cookie) {
    console.error('Failed to get cookie.');
    return;
  }

  const accessCookie = loginRes.cookie[0].split(';')[0];

  console.log('\n--- 2. Testing Profile with Cookie ---');
  const profileRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/auth/profile',
      method: 'GET',
      headers: {
        'Cookie': accessCookie
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('Profile Status:', profileRes.status);
  console.log('Profile Data:', profileRes.data);

  console.log('\n--- 3. Testing Logout ---');
  const logoutRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3003,
      path: '/auth/logout',
      method: 'POST',
      headers: {
        'Cookie': accessCookie
      }
    }, (res) => {
      let data = '';
      const cookie = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, cookie, data }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('Logout Status:', logoutRes.status);
  console.log('Cookie cleared:', logoutRes.cookie ? (logoutRes.cookie[0].includes('Max-Age=0') || logoutRes.cookie[0].includes('expires=Thu, 01 Jan 1970')) : 'NO');
}

testPersistence().catch(console.error);
