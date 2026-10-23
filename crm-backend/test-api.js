// API test script. Server chalu rakho (npm run dev), phir dusre terminal me:
//   node test-api.js
// Node 18+ chahiye (built-in fetch).

const BASE = process.env.BASE || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const stamp = Date.now().toString().slice(-6);
const sellerEmail = `seller${stamp}@test.com`;
const phoneA = '98' + stamp.padStart(8, '1'); // 10 digit, 98 se shuru
const phoneB = '97' + stamp.padStart(8, '2');

let pass = 0;
let fail = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, data };
}

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

(async () => {
  console.log('Base URL:', BASE, '\n');

  console.log('1. Health');
  let r = await call('GET', '/health');
  check('server chal raha hai', r.status === 200 && r.data.ok === true, `(status ${r.status})`);

  console.log('\n2. Login');
  r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login', r.status === 200 && r.data.token, JSON.stringify(r.data));
  const adminToken = r.data && r.data.token;
  if (!adminToken) {
    console.log('\nAdmin login nahi hua. Pehle `npm run seed` chalao aur .env check karo.');
    process.exit(1);
  }
  r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: 'galat-password' } });
  check('galat password reject', r.status === 401);
  r = await call('GET', '/leads');
  check('bina token ke leads nahi dikhti', r.status === 401);

  console.log('\n3. Admin: seller banana');
  r = await call('POST', '/users', {
    token: adminToken,
    body: { name: 'Test Seller', email: sellerEmail, phone: phoneA, password: 'seller123' },
  });
  check('seller create', r.status === 201, JSON.stringify(r.data));
  const sellerId = r.data && r.data.id;
  r = await call('POST', '/users', {
    token: adminToken,
    body: { name: 'Test Seller', email: sellerEmail, password: 'seller123' },
  });
  check('duplicate seller email reject', r.status === 409);

  console.log('\n4. Seller login');
  r = await call('POST', '/auth/login', { body: { email: sellerEmail, password: 'seller123' } });
  check('seller login', r.status === 200 && r.data.token);
  const sellerToken = r.data && r.data.token;
  r = await call('POST', '/users', {
    token: sellerToken,
    body: { name: 'X', email: `x${stamp}@test.com`, password: 'abcdef' },
  });
  check('seller, seller nahi bana sakta (403)', r.status === 403);

  console.log('\n5. Leads (admin)');
  r = await call('POST', '/leads', {
    token: adminToken,
    body: { name: 'Rahul', phone: `+91 ${phoneB.slice(0, 5)} ${phoneB.slice(5)}`, email: 'rahul@test.com' },
  });
  check('lead create (phone alag format me)', r.status === 201, JSON.stringify(r.data));
  check('phone normalize hua (91XXXXXXXXXX)', r.data && r.data.phone === '91' + phoneB, `(mila: ${r.data && r.data.phone})`);
  check('source = manual', r.data && r.data.source === 'manual');
  const adminLeadId = r.data && r.data._id;

  r = await call('POST', '/leads', { token: adminToken, body: { name: 'Rahul 2', phone: `0${phoneB}` } });
  check('same number dobara = duplicate reject (409)', r.status === 409, JSON.stringify(r.data));
  r = await call('POST', '/leads', { token: adminToken, body: { name: 'Bad', phone: '12345' } });
  check('galat phone reject (400)', r.status === 400);

  console.log('\n6. Assign aur seller ka access');
  r = await call('GET', '/leads', { token: sellerToken });
  check('seller ko abhi 0 leads dikhti hain', r.status === 200 && r.data.total === 0, JSON.stringify(r.data && r.data.total));
  r = await call('GET', `/leads/${adminLeadId}`, { token: sellerToken });
  check('unassigned lead seller nahi khol sakta (403)', r.status === 403);

  r = await call('PATCH', `/leads/${adminLeadId}/assign`, { token: adminToken, body: { sellerId } });
  check('admin ne seller assign kiya', r.status === 200, JSON.stringify(r.data));
  r = await call('GET', '/leads', { token: sellerToken });
  check('ab seller ko 1 lead dikhti hai', r.status === 200 && r.data.total === 1);

  console.log('\n7. Seller: status aur notes');
  r = await call('PATCH', `/leads/${adminLeadId}/status`, { token: sellerToken, body: { status: 'contacted' } });
  check('status -> contacted', r.status === 200 && r.data.status === 'contacted');
  r = await call('PATCH', `/leads/${adminLeadId}/status`, { token: sellerToken, body: { status: 'kuchbhi' } });
  check('galat status reject', r.status === 400);
  r = await call('POST', `/leads/${adminLeadId}/notes`, { token: sellerToken, body: { text: 'Kal call karna hai' } });
  check('note add', r.status === 201 && r.data.length === 1);
  r = await call('PATCH', `/leads/${adminLeadId}/assign`, { token: sellerToken, body: { sellerId } });
  check('seller assign nahi kar sakta (403)', r.status === 403);

  console.log('\n8. Seller khud lead banaye');
  r = await call('POST', '/leads', { token: sellerToken, body: { name: 'Seller Lead', phone: '96' + stamp.padStart(8, '3') } });
  check('seller ki lead create', r.status === 201 && r.data.assignedTo === sellerId, JSON.stringify(r.data));

  console.log('\n9. Search aur filter');
  r = await call('GET', '/leads?search=Rahul', { token: adminToken });
  check('search "Rahul"', r.status === 200 && r.data.items.length >= 1);
  r = await call('GET', '/leads?status=contacted', { token: adminToken });
  check('filter status=contacted', r.status === 200 && r.data.items.every((l) => l.status === 'contacted'));

  console.log('\n10. Dashboard stats');
  r = await call('GET', '/stats/admin', { token: adminToken });
  check('admin stats', r.status === 200 && r.data.cards && r.data.cards.totalLeads >= 2, JSON.stringify(r.data && r.data.cards));
  check('14 din ka trend', r.data && r.data.leadsPerDay && r.data.leadsPerDay.length === 14);
  r = await call('GET', '/stats/seller', { token: sellerToken });
  check('seller stats', r.status === 200 && r.data.cards.totalLeads === 2, JSON.stringify(r.data && r.data.cards));
  r = await call('GET', '/stats/admin', { token: sellerToken });
  check('seller admin stats nahi dekh sakta (403)', r.status === 403);

  console.log('\n11. Seller block');
  r = await call('PATCH', `/users/${sellerId}`, { token: adminToken, body: { isActive: false } });
  check('seller block', r.status === 200 && r.data.isActive === false);
  r = await call('GET', '/leads', { token: sellerToken });
  check('blocked seller ka purana token bhi band (401)', r.status === 401);
  r = await call('POST', '/auth/login', { body: { email: sellerEmail, password: 'seller123' } });
  check('blocked seller login nahi kar sakta (403)', r.status === 403);

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  console.log('(Test data DB me reh jayega: seller ' + sellerEmail + ' aur 2 leads. Chaho to Atlas se delete kar dena.)');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Script error:', e.message);
  console.error('Kya server chal raha hai? (npm run dev)');
  process.exit(1);
});