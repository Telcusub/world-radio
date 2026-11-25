#!/usr/bin/env python3
"""Find working live streams for Islamic stations that the radio directory lacks.

Reads tools/candidates.json (station name, country, category and the public web
pages where the station offers its live player), looks in those pages, and in
same-site pages linked as "live"/"listen", for audio stream addresses, then
test-plays each one. Also re-checks every stream in islamic-extra.json.

Writes data/report/streams.json for review. Nothing is added to the app
automatically: working streams are copied into islamic-extra.json by hand.
"""
import json, os, re, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
UA = "Mozilla/5.0 (compatible; WorldRadio/1.0; +https://github.com/Telcusub/world-radio)"
URL_RX = re.compile(r"""https?://[^\s"'<>\\)]+""", re.I)
STREAM_HINT = re.compile(r"zeno\.fm|radio\.co|streamtheworld|icecast|shoutcast|radiojar|mixlr|radioking|infomaniak|sonicpanel|streamguys|"
                         r"reliastream|ice\d*\.|stream\d*\.|/stream|/live|;stream|:\d{4,5}/|\.mp3|\.aac|\.m3u8|\.pls|\.m3u\b|listen", re.I)
SKIP = re.compile(r"\.(?:png|jpe?g|gif|svg|webp|css|js|woff2?|ico)(?:\?|$)|facebook|twitter|instagram|youtube|whatsapp|google|apple\.com|"
                  r"play\.google|wp-content/plugins|gravatar|schema\.org|w3\.org", re.I)
LIVE_LINK = re.compile(r"live|listen|stream|radio|player|direct|mubashir|canli|dinle|sikiliza|dhageyso", re.I)
AUDIO_CT = re.compile(r"audio/|mpegurl|x-scpls|ogg|aacp", re.I)


def fetch(url, n=400_000, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Icy-MetaData": "0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.geturl(), r.headers.get("Content-Type", ""), r.read(n)


def probe(url):
    """Return (ok, content_type, final_url) after reading a little of the stream."""
    try:
        final, ct, body = fetch(url, n=4096, timeout=10)
    except Exception as e:
        return False, f"error: {type(e).__name__}", url
    if re.search(r"x-scpls|mpegurl|\.pls|\.m3u(?!8)", ct + " " + url, re.I) and not re.search(r"m3u8|apple", ct + url, re.I):
        inner = [u for u in URL_RX.findall(body.decode("utf-8", "ignore"))]
        for u in inner[:3]:
            ok, ct2, f2 = probe(u)
            if ok:
                return ok, ct2, f2
        return False, "playlist without a working stream", url
    if AUDIO_CT.search(ct) or (body[:3] == b"ID3") or (body[:1] == b"\xff"):
        return True, ct, final
    if b"#EXTM3U" in body[:20]:
        return True, "hls", final
    return False, ct or "not audio", url


def candidates_in(html, base):
    found = set()
    for u in URL_RX.findall(html):
        u = u.rstrip(".,;")
        if not SKIP.search(u) and STREAM_HINT.search(u):
            found.add(u)
    for m in re.finditer(r"""(?:src|href|data-src|data-url|data-stream|file)\s*=\s*["']([^"']+)["']""", html, re.I):
        u = urllib.parse.urljoin(base, m.group(1))
        if u.startswith("http") and not SKIP.search(u) and STREAM_HINT.search(u):
            found.add(u)
    return found


def same_site_live_links(html, base):
    host = urllib.parse.urlparse(base).netloc
    out = []
    for m in re.finditer(r"""href\s*=\s*["']([^"'#]+)["']""", html, re.I):
        u = urllib.parse.urljoin(base, m.group(1))
        if urllib.parse.urlparse(u).netloc == host and LIVE_LINK.search(u) and u != base and not SKIP.search(u):
            out.append(u)
    return list(dict.fromkeys(out))[:6]


def search_station(c):
    tried, streams, notes = set(), [], []
    pages = list(c.get("pages", []))
    for depth in (0, 1):
        nxt = []
        for p in pages:
            if p in tried:
                continue
            tried.add(p)
            try:
                final, ct, body = fetch(p)
            except Exception as e:
                notes.append(f"{p}: {type(e).__name__}")
                continue
            html = body.decode("utf-8", "ignore")
            for u in sorted(candidates_in(html, final)):
                if u in tried:
                    continue
                tried.add(u)
                ok, ctype, f = probe(u)
                if ok:
                    streams.append({"url": f, "type": ctype, "https": f.lower().startswith("https://"), "found_on": p})
            if depth == 0:
                nxt += same_site_live_links(html, final)
        pages = nxt
        if streams:
            break
    return {"name": c["name"], "countrycode": c.get("countrycode", ""), "category": c.get("category", ""),
            "streams": streams[:5], "notes": notes[:5]}


def main():
    cands = json.load(open(os.path.join(ROOT, "tools", "candidates.json"), encoding="utf-8"))
    results = [search_station(c) for c in cands]
    extra = json.load(open(os.path.join(ROOT, "islamic-extra.json"), encoding="utf-8")).get("add", [])
    checks = []
    for s in extra:
        ok, ct, f = probe(s["url"])
        checks.append({"name": s["name"], "url": s["url"], "ok": ok, "type": ct})
    os.makedirs(os.path.join(ROOT, "data", "report"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "report", "streams.json"), "w", encoding="utf-8") as f:
        json.dump({"candidates": results, "extra_checks": checks}, f, ensure_ascii=False, indent=1)
    found = [r["name"] for r in results if r["streams"]]
    print(f"streams found for {len(found)} of {len(results)}: {found}")
    print("hand-picked checks:", [(c["name"], c["ok"]) for c in checks])


if __name__ == "__main__":
    main()
