import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped auth script with a minimal DOM; this is not browser QA.
const html = readFileSync('public/auth/index.html', 'utf8');
const script = readFileSync('public/auth/auth.js', 'utf8');
const factorId = '00000000-0000-4000-8000-000000000003';
async function setup(role, enrolled, verified, confirmRemoval = true) {
  const node = () => ({ hidden: false, value: '', type: 'password', classList: { toggle() {} },
    replaceChildren() {}, append() {}, setAttribute() {}, querySelector() { return this.input ??= node(); } });
  const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], node()]));
  const calls = [], redirects = [];
  const context = vm.createContext({
    document: { getElementById: id => { assert(nodes.has(id), id); return nodes.get(id); },
      querySelectorAll: () => [], createElement: node, head: node() },
    window: {}, TextEncoder, URLSearchParams, confirm: () => confirmRemoval,
    location: { hash:'', replace: path => redirects.push(path) },
    fetch: async (path, options) => {
      calls.push({ path, options });
      let value;
      if (path.endsWith('/config')) value = { ready: true, mode: 'standalone', registrationPolicy: 'email_verified' };
      else if (path.endsWith('/me')) value = { user: { role, status: 'active', email: 'admin@nerhadou.com' },
        mode: 'standalone', purpose: 'login', csrf: 'session-csrf', mfa: verified, mfaRequired: enrolled && !['owner','admin'].includes(role) };
      else if (path.endsWith('/mfa-list')) value = { factors: [{ id: factorId, status: 'verified' }] };
      else if (path.endsWith('/mfa-unenroll')) value = { ok: true };
      else throw Error('Unexpected request: ' + path);
      return { ok: true, json: async () => value };
    },
  });
  vm.runInContext(script, context);
  // Finish the config and session promises before inspecting rendered state.
  await new Promise(setImmediate);
  assert.equal(nodes.get('form-title').textContent, 'Your account');
  return { nodes, calls, redirects };
}

for (const role of ['owner', 'admin', 'viewer']) {
  const plain = await setup(role, false, false);
  assert.equal(plain.nodes.get('open-dashboard').hidden, false, role + ' needs no enrollment');
  assert.equal(plain.nodes.get('mfa-disable').hidden, true);
  const enrolled = await setup(role, true, false);
  assert.equal(enrolled.nodes.get('open-dashboard').hidden, role==='viewer', 'Only enrolled viewers require MFA');
  assert.equal(enrolled.nodes.get('mfa-panel').hidden, role!=='viewer', 'Owner/admin authenticator controls are hidden');
  await enrolled.nodes.get('mfa-disable').onclick();
  assert(enrolled.nodes.get('form-message').textContent.includes('Verify your current authenticator'));
  assert.equal(enrolled.calls.filter(c => c.path.endsWith('/mfa-unenroll')).length, 0);
  const verified = await setup(role, true, true);
  assert.equal(verified.nodes.get('open-dashboard').hidden, false);
  await verified.nodes.get('mfa-disable').onclick();
  const removal = verified.calls.find(c => c.path.endsWith('/mfa-unenroll'));
  assert.equal(removal.options.headers['X-CSRF-Token'], 'session-csrf');
  assert.deepEqual(JSON.parse(removal.options.body), { factorId });
  assert.deepEqual(verified.redirects, ['/auth/']);
}
const cancelled = await setup('admin', true, true, false);
await cancelled.nodes.get('mfa-disable').onclick();
assert.equal(cancelled.calls.filter(c => c.path.endsWith('/mfa-unenroll')).length, 0);
assert(html.includes('Optional for all accounts, including administrators.'));
console.log('Auth UI passed: owner/admin MFA exemption, enrolled-viewer gate, verified removal, CSRF and cancellation.');

const emailFunction=script.match(/^function companyEmail\(value\)\{.*\}$/m)?.[0];assert(emailFunction);const emailContext=vm.createContext({});vm.runInContext(emailFunction,emailContext);for(const input of ['ali.ashour',' ali.ashour@NERHADOU.COM '])assert.equal(vm.runInContext('companyEmail('+JSON.stringify(input)+')',emailContext),'ali.ashour@nerhadou.com');for(const input of ['', 'ali@gmail.com','ali@nerhadou.com.evil.test','ali@nerhadou.com@nerhadou.com','.ali','ali..ashour'])assert.throws(()=>vm.runInContext('companyEmail('+JSON.stringify(input)+')',emailContext));assert(html.includes('id="email-domain">@nerhadou.com'));assert(html.includes('Powered by <strong>Ali Ashour</strong>'));console.log('Fixed company email suffix checks passed.');
