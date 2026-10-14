import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/**
 * HTTP(S) fetching for URLs supplied by a model: refuses anything that does not lead to a public
 * address (loopback, private networks, link-local, cloud metadata…). The check is done at
 * connection time (`lookup` option), so a DNS that changes between two resolutions cannot bypass it.
 */

const isPrivateV4 = (ip: string) => {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast, reserved
  );
};

/** Expands an IPv6 address into 8 groups of 16 bits (handles "::" and a dotted IPv4 tail). */
function expandV6(ip: string): number[] | null {
  let v = ip.toLowerCase().split("%")[0];
  const dotted = v.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const [a, b, c, d] = dotted[2].split(".").map(Number);
    v = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = v.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 0) return null;
  const groups = [...head, ...(halves.length === 2 ? Array(fill).fill("0") : []), ...tail].map((g) => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

const v4From = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind === 6) {
    const g = expandV6(ip);
    if (!g) return true;
    const zero = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
    if (zero(0, 5) && g[5] === 0xffff) return isPrivateV4(v4From(g[6], g[7])); // encapsulated IPv4 (::ffff:a.b.c.d)
    if (zero(0, 6)) return true; // ::, ::1 and ::/96 (IPv4-compatible, obsolete)
    if (g[0] === 0x64 && g[1] === 0xff9b && zero(2, 6)) return isPrivateV4(v4From(g[6], g[7])); // NAT64
    if (g[0] === 0x2002) return isPrivateV4(v4From(g[1], g[2])); // 6to4: embedded IPv4
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 (adresses locales uniques)
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 (lien-local)
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    return false;
  }
  return true; // not an address: refuse
}

const guardedLookup: typeof dns.lookup = ((hostname: string, options: dns.LookupOptions, cb: (...a: unknown[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return cb(err);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return cb(Object.assign(new Error(`Non-public address refused for ${hostname}`), { code: "EBLOCKED" }));
    }
    if (options.all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}) as typeof dns.lookup;

export type SafeResponse = { status: number; url: string; headers: http.IncomingHttpHeaders; body: Buffer };

function once(url: URL, opts: { method: string; headers: Record<string, string>; maxBytes: number; timeoutMs: number }): Promise<SafeResponse> {
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      { method: opts.method, headers: opts.headers, lookup: guardedLookup, timeout: opts.timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            // Keep the beginning (enough to read the <head>) and cut the connection.
            chunks.push(c.subarray(0, c.length - (size - opts.maxBytes)));
            res.destroy();
            return;
          }
          chunks.push(c);
        });
        const done = () => resolve({ status: res.statusCode ?? 0, url: url.toString(), headers: res.headers, body: Buffer.concat(chunks) });
        res.on("end", done);
        res.on("close", done);
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function safeFetch(
  rawUrl: string,
  opts: { method?: string; headers?: Record<string, string>; maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {},
): Promise<SafeResponse> {
  let url = new URL(rawUrl);
  for (let i = 0; i <= (opts.maxRedirects ?? 4); i++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`Protocol refused: ${url.protocol}`);
    // A literal address does not go through `lookup`: we check it here (IPv6 brackets removed).
    const literal = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(literal) && isPrivateAddress(literal)) throw new Error("Non-public address refused");
    const res = await once(url, {
      method: opts.method ?? "GET",
      maxBytes: opts.maxBytes ?? 400_000,
      timeoutMs: opts.timeoutMs ?? 8000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-news-bot)", "Accept-Encoding": "identity", Accept: "text/html,image/*;q=0.8,*/*;q=0.5", ...opts.headers },
    });
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    return res;
  }
  throw new Error("Trop de redirections");
}
