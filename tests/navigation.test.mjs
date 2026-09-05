import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const site = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('vsl/navigation.js', site), 'utf8');
const routes = ['pt/', 'es/', 'es/mx/', 'es/co/', 'es/cl/', 'es/pe/', 'es/ar/'];
function page(url, html, base) {
  const links = [...html.matchAll(/<a\s+([^>]+)>/g)].map(([, attrs]) => ({
    attrs,
    href: new URL(attrs.match(/href="([^"]+)"/)[1], url).href,
    getAttribute(name) { return this.attrs.match(new RegExp(name + '="([^"]+)"'))?.[1]; }
  }));
  const document = {
    currentScript: { src: new URL('navigation.js', base).href },
    querySelectorAll(selector) { const attribute = selector.match(/\[(.+)\]/)[1]; return links.filter(link => link.attrs.includes(attribute)); }
  };
  vm.runInNewContext(source, { document, window: { location: new URL(url) }, URL, URLSearchParams });
  return links;
}
for (const base of ['https://muriloferrari99.github.io/pequenos-ritmos-latam/vsl/', 'http://localhost:8080/vsl/']) {
  for (const route of routes) {
    const html = fs.readFileSync(new URL('vsl/' + route + 'index.html', site), 'utf8');
    const params = new URLSearchParams({ utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'pr-br-kit500-purchase-k2', utm_content: '1201', mcid: '1202', masid: '1203', maid: '1201', sck: '1201', email: 'user@example.com', child_age: '4', quiz_profile: 'OBS', fbclid: 'click-secret', off: 'bad', return_to: 'https://evil.example/' });
    for (const suffix of ['', 'index.html']) {
      const entry = new URL(route + suffix + '?' + params.toString(), base);
      const links = page(entry, html, base);
      const logo = links.find(link => link.getAttribute('href') === '#top');
      assert(logo); assert.equal(new URL(logo.href).search, entry.search);
      const policies = links.filter(link => link.attrs.includes('data-policy-link'));
      assert.equal(policies.length, 3);
      for (const policy of policies) {
        const url = new URL(policy.href);
        assert.equal(url.searchParams.get('return_to'), route);
        for (const key of ['email', 'child_age', 'quiz_profile', 'fbclid', 'off']) assert.equal(url.searchParams.has(key), false);
        const legalFile = route.startsWith('pt/') ? 'pt/' : 'es/';
        const policyHtml = fs.readFileSync(new URL('vsl/' + legalFile + url.pathname.split('/').at(-1), site), 'utf8');
        const back = new URL(page(url, policyHtml, base).find(link => link.attrs.includes('data-policy-return')).href);
        assert.equal(back.pathname, new URL(route, base).pathname);
        assert.equal(back.origin, new URL(base).origin);
        for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'mcid', 'masid', 'maid', 'sck']) assert.equal(back.searchParams.get(key), params.get(key));
        for (const key of ['email', 'child_age', 'quiz_profile', 'fbclid', 'off', 'return_to']) assert.equal(back.searchParams.has(key), false);
      }
    }
  }
  const legalHtml=fs.readFileSync(new URL('vsl/es/privacidade.html',site),'utf8');
  for (const invalid of ['https://evil.example/', '//evil.example/', '../', 'es/../../evil', 'es/mx/?email=secret', 'es/%2e%2e/', '/es/mx/', 'es/xx/', 'javascript:alert(1)']) {
    const url=new URL('es/privacidade.html',base);url.searchParams.set('return_to',invalid);url.searchParams.set('utm_source','meta');
    const back=new URL(page(url,legalHtml,base).find(link=>link.attrs.includes('data-policy-return')).href);
    assert.equal(back.href,new URL('es/',base).href);
  }
}
console.log('PASS: seven country/language routes, both policies, consent policy link, logo query, production/local base, index.html paths, campaign retention, prohibited fields and invalid redirect rejection.');
