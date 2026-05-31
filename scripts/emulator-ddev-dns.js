/*
 * emulator-ddev-dns.js — host DNS responder so the Android emulator can reach the local DDEV site.
 *
 * WHY: the emulator is a separate VM; its 127.0.0.1 is NOT the host's. DDEV is published only on the
 * host loopback. The emulator can reach the host bidirectionally ONLY via the NAT alias 10.0.2.2
 * (`adb reverse` is broken on this machine — its return path drops data; proven 2026-05-31). But
 * *.ddev.site resolves (publicly) to 127.0.0.1, which inside the emulator is its own dead loopback.
 *
 * FIX: this DNS server answers any *.ddev.site query with A=10.0.2.2 (the host), and forwards every
 * other query to a real upstream resolver. Boot the emulator pointed at it (see usage). The app then
 * keeps the real https://tq-pro-teams-php8.ddev.site URL — only the IP it resolves to changes — so
 * SNI/Host are correct, DDEV serves its mkcert cert, and the bundled CA (already trusted) validates.
 *
 * USAGE:
 *   node scripts/emulator-ddev-dns.js                       # leave running for the E2E session
 *   # then boot the emulator pointed at this resolver:
 *   emulator -avd Pixel_9 -dns-server 127.0.0.1 -no-snapshot-load
 *   # verify from the guest:  adb shell ping -c1 tq-pro-teams-php8.ddev.site   (should show 10.0.2.2)
 */
const dgram = require('dgram');

const TARGET_IP = '10.0.2.2';   // emulator's alias for the host loopback (where DDEV lives)
const UPSTREAM = '8.8.8.8';     // forward all non-ddev queries here
const PORT = 53;

const server = dgram.createSocket('udp4');

// Parse the (single) question: returns { name, qtype, qend }. Questions never use compression.
function parseQuestion(msg) {
  let off = 12;
  const labels = [];
  while (msg[off] !== 0) {
    const len = msg[off];
    labels.push(msg.slice(off + 1, off + 1 + len).toString('ascii'));
    off += 1 + len;
  }
  off += 1; // null label
  return { name: labels.join('.'), qtype: msg.readUInt16BE(off), qend: off + 4 };
}

function header(query, ancount) {
  const h = Buffer.alloc(12);
  query.copy(h, 0, 0, 2);            // copy transaction ID
  h.writeUInt16BE(0x8180, 2);        // QR=1, RD=1, RA=1, RCODE=0
  h.writeUInt16BE(1, 4);             // QDCOUNT
  h.writeUInt16BE(ancount, 6);       // ANCOUNT
  return h;
}

function answerA(query, q, ip) {
  const a = Buffer.alloc(16);
  a.writeUInt16BE(0xc00c, 0);        // pointer to the question name at offset 12
  a.writeUInt16BE(1, 2);             // TYPE A
  a.writeUInt16BE(1, 4);             // CLASS IN
  a.writeUInt32BE(30, 6);            // TTL
  a.writeUInt16BE(4, 10);            // RDLENGTH
  ip.split('.').forEach((o, i) => { a[12 + i] = Number(o); });
  return Buffer.concat([header(query, 1), query.slice(12, q.qend), a]);
}

function emptyAnswer(query, q) {
  return Buffer.concat([header(query, 0), query.slice(12, q.qend)]);
}

server.on('message', (msg, rinfo) => {
  let q;
  try { q = parseQuestion(msg); } catch { return; }
  const name = q.name.toLowerCase();

  if (name === 'tq-pro-teams-php8.ddev.site' || name.endsWith('.ddev.site') || name.endsWith('ddev.site')) {
    if (q.qtype === 1) {                       // A
      server.send(answerA(msg, q, TARGET_IP), rinfo.port, rinfo.address);
      console.log(`${name} A -> ${TARGET_IP}`);
    } else {                                    // AAAA/other -> NODATA so the resolver uses A
      server.send(emptyAnswer(msg, q), rinfo.port, rinfo.address);
      console.log(`${name} type ${q.qtype} -> (empty, use A)`);
    }
    return;
  }

  // Forward everything else to the upstream resolver and relay the reply.
  const fwd = dgram.createSocket('udp4');
  const done = setTimeout(() => { try { fwd.close(); } catch {} }, 5000);
  fwd.on('message', (resp) => { server.send(resp, rinfo.port, rinfo.address); clearTimeout(done); fwd.close(); });
  fwd.on('error', () => { clearTimeout(done); try { fwd.close(); } catch {} });
  fwd.send(msg, 53, UPSTREAM);
});

server.on('error', (e) => { console.error('DNS server error:', e.message); process.exit(1); });
// Bind the loopback explicitly: a 0.0.0.0-bound UDP socket on Windows replies to loopback queries
// from the WRONG source IP, so clients (and the emulator's slirp DNS forward) discard the reply.
server.bind(PORT, '127.0.0.1', () => console.log(`DDEV DNS responder on 127.0.0.1:${PORT} — *.ddev.site -> ${TARGET_IP}, else -> ${UPSTREAM}`));
