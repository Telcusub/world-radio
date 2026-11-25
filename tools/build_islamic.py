#!/usr/bin/env python3
"""Build World Radio's Sunni Islamic station list.

Runs on GitHub Actions (see .github/workflows/islamic.yml). It downloads the
whole Radio Browser directory and the mp3quran.net Quran radios, keeps the
Sunni Islamic stations, sorts each into one category, and writes:

  data/islamic.json          the list the app loads
  data/report/summary.json   counts by country and category, plus the count
                             the app's earlier live search would have found
  data/report/review.json    near misses and exclusions, for checking rules
  data/report/index.json     every station in Muslim-majority countries
                             (name, id, stream), used to check research

Taxonomy (same rules as the app's Islamic tab):
  Quran            recitation and Quran radios
  Mosque live      live audio from mosques and the call to prayer
  Nasheed          nasheed, ilahi, naat and other devotional songs
  Lectures & dawah sheikhs, lessons, tafsir, fatwa, dawah, Salafi radios
  Islamic talk     other Muslim and Islamic stations
Stations marked Shia or Ahmadi, and stations from Iran, are left out.
"""
import collections, datetime, gzip, json, os, random, re, sys, urllib.request

UA = "WorldRadio/1.0 (+https://github.com/Telcusub/world-radio)"
OUT = os.path.join(os.path.dirname(__file__), "..", "data")
FALLBACK = ["de1.api.radio-browser.info", "de2.api.radio-browser.info",
            "fi1.api.radio-browser.info", "nl1.api.radio-browser.info"]

INC = re.compile("|".join([
    r"qur'?a+n", r"\bkur'?an", r"\bkoran", r"\bcoran\b", r"\bkuran\b", r"islam(?!abad|orada)",
    r"muslim", r"\bsunn(?:ah?|i)\b", r"nasheed", r"nasyid", r"hadith", r"da'?wah", r"dakwah",
    r"\biqra", r"salaf", r"tafs[ie]e?r", r"tilawa", r"tajw[ie]e?d", r"\badhan\b", r"\baza?an\b",
    r"ruqy", r"fatwa", r"\bsh[ae]i?y?kh\b", r"\bal[\s-]?[ie]man\b", r"\bimaan\b", r"mustaqim",
    r"hidaya", r"\bal[\s-]?huda\b", r"furqan", r"tawh?ee?d|tawhid", r"\bmasjid", r"\bmosque",
    r"\bilahi", "İlahi", r"\bnaat\b", r"\bmadrasa", r"sholawat|shalawat|salawat", r"kajian|pengajian",
    "قرآن", "القران", "اسلام", "إسلام", "اسلامی", "السلف", "دار الحديث", "السنة النبوية",
    "أهل السنة", "اهل السنة", "الإيمان", "الايمان", "الشيخ", "تلاوة", "تلاوات", "تفسير", "دعوة",
    "التوحيد", "فتاوى", "مصحف", "الأذان", "رقية", "ابن القيم", "ابن باز", "ابن عثيمين", "الألباني",
    "الهدى", "الفرقان", "أناشيد", "اناشيد", "مسجد", "الحرم", "القارئ", "ابن أبي زيد", r"\bdiyanet\b", r"\bikim\b",
]), re.I)

EXC = re.compile("|".join([
    r"shi'?a\b", r"\bshia", r"shiite|shi'ite", r"ahl.?(?:ul|e|al).?ba[iy]t",
    r"hussain|husain|hussein|husayn|hossein", r"karbala|kerbala", r"ashura", r"\bnoha|nauha",
    r"marsiya", r"\bzahra\b", r"imam.?(?:ali|reza|riza|husain|mahdi|zaman)", r"mahdi", r"ahmadi",
    r"\bmta\b", r"alislam\.org", r"voice of islam", r"al.?kawthar", r"ja'?fari", r"twelver",
    r"najaf", r"sistani", r"kadhim", r"gospel|christian|catholic|\bbible|\bchurch", r"magomaev|магомаев", r"radio asian air", r"fm 100 pakistan",
    "عاشوراء", "الحسين", "كربلاء", "أهل البيت", "اهل البيت", "شيعة", "الشيعة", "الكوثر", "العتبة",
    "السيستاني", "المرجعية", "النجف", "الكاظم", "الزهراء", "الأحمدية", "الاحمدية",
]), re.I)

CATS = [
    ("Quran", re.compile(r"qur'?a+n|\bkur'?an|\bkoran|\bcoran\b|\bkuran\b|tilawa|tajw|recit|quraan|قرآن|القران|مصحف|تلاو|ترتيل", re.I)),
    ("Mosque live", re.compile(r"\bmasjid|\bmosque|\bharam\b|haramain|\badhan\b|\baza?an\b|مسجد|الحرم|الأذان", re.I)),
    ("Nasheed", re.compile(r"nasheed|nasyid|ilahi|İlahi|\bnaat\b|sholawat|shalawat|salawat|madih|qasida|qaseeda|أناشيد|اناشيد|نشيد|إنشاد|انشاد|مدائح", re.I)),
    ("Lectures & dawah", re.compile(r"sh[ae]i?y?kh|lecture|durus|tafs|fatwa|da'?wah|dakwah|salaf|hadith|\bsunn(?:ah?|i)\b|fiqh|ruqy|khutb|ulama|kajian|pengajian|الشيخ|دروس|محاضر|تفسير|فتاو|دعوة|السلف|الحديث|السنة|فقه|رقية|خطب|علماء", re.I)),
]

# The app's earlier live search (before this list existed), to answer "how many do we have now".
OLD_TAGS = ['quran', 'quraan', "qur'an", 'koran', 'coran', 'kuran', 'islam', 'muslim', 'sunna', 'nasheed', 'hadith', 'dawah', 'dakwah', 'salaf', 'tafsir', 'religious', 'religion', 'قرآن', 'القرآن', 'اسلام', 'إسلام', 'السلفية', 'دعوة']
OLD_NAMES = ['quran', 'quraan', 'koran', 'coran', 'islam', 'sunna', 'nasheed', 'iqra', 'salaf', 'sheikh', 'shaykh', 'tafsir', 'mustaqim', 'eman', 'iman', 'huda', 'hidaya', 'furqan', 'tawheed', 'masjid', 'mosque', 'adhan', 'قرآن', 'القرآن', 'السلفية', 'الحديث', 'الإيمان', 'الايمان', 'الشيخ', 'تلاوة', 'تفسير', 'السنة', 'دعوة', 'التوحيد', 'الهدى', 'الفرقان']
OLD_CC = ['YE', 'SO', 'SA']
OLD_RX = re.compile("|".join([
    r"qur'?a+n", "koran", "coran", "kuran", r"islam(?!abad)", "muslim", r"\bsunn(?:ah?|i)\b", "nasheed", "hadith", "dawah", "dakwah", r"\biqra",
    "salaf", r"tafs[ie]e?r", "tilawa", r"\badhan\b", r"\baza?an\b", "ruqy", "fatwa", r"\bsh[ae]i?y?kh\b", r"\bal[\s-]?[ie]man\b", "mustaqim", "hidaya", r"\bal[\s-]?huda\b", "furqan", r"tawh?ee?d|tawhid", r"\bmasjid", r"\bmosque",
    "قرآن", "القران", "اسلام", "إسلام", "اسلامی", "السلف", "دار الحديث", "السنة النبوية", "أهل السنة", "اهل السنة", "الإيمان", "الايمان", "الشيخ", "تلاوة", "تلاوات", "تفسير", "دعوة", "التوحيد", "فتاوى", "مصحف", "الأذان", "رقية", "ابن القيم", "ابن باز", "ابن عثيمين", "الألباني", "الهدى", "الفرقان",
]), re.I)
OLD_EXC = re.compile(r"shi'?a\b|shia|shiite|shi'ite|ahl.?(?:ul|e|al).?ba[iy]t|hussain|husain|hussein|husayn|hossein|karbala|ashura|noha|nauha|marsiya|zahra|imam.?(?:ali|reza|riza|husain|mahdi)|mahdi|ahmadi|al.?kawthar|ja'?fari|twelver|عاشوراء|الحسين|كربلاء|أهل البيت|اهل البيت|شيعة|الكوثر", re.I)

# Known Sunni Islamic stations, found by name. The report says which ones the directory lacks.
KNOWN = [
    (r"rodja", "ID", "Lectures & dawah"), (r"\bmq ?fm\b", "ID", "Islamic talk"), (r"\bhang ?(?:106|fm)\b|hang106", "ID", "Lectures & dawah"),
    (r"\bfajri\b", "ID", "Islamic talk"), (r"\bradio bir\b", "BA", "Islamic talk"), (r"\bikim ?fm\b", "MY", "Islamic talk"),
    (r"^zayan$", "MY", "Islamic talk"), (r"\berkam\b", "TR", "Islamic talk"), (r"lalegül|lalegul", "TR", "Islamic talk"),
    (r"\bvav radyo\b", "TR", "Islamic talk"), (r"\bsemerkand\b", "TR", "Islamic talk"), (r"\bal.?fayda\b", "SN", "Islamic talk"),
    (r"revive ?fm", "GB", "Islamic talk"), (r"inspire ?fm", "GB", "Islamic talk"), (r"\bunity ?fm\b", "GB", "Islamic talk"),
    (r"crescent radio", "GB", "Islamic talk"), (r"radio dawn", "GB", "Islamic talk"), (r"salaam radio", "GB", "Islamic talk"),
    (r"radio salam manchester", "GB", "Islamic talk"), (r"voice of the cape|^voc$", "ZA", "Islamic talk"), (r"radio islam", "ZA", "Islamic talk"),
    (r"al.?ansaar", "ZA", "Islamic talk"), (r"channel islam", None, "Islamic talk"), (r"markaz sahaba", "ZA", "Lectures & dawah"),
    (r"radio rahma", "KE", "Islamic talk"), (r"iqra fm", "KE", "Islamic talk"), (r"radio salaam", "KE", "Islamic talk"), (r"jamia radio", "KE", "Islamic talk"),
    (r"rahma radio", "NG", "Islamic talk"), (r"sunna radio", "NG", "Lectures & dawah"), (r"qurbaha", "SO", "Islamic talk"),
    (r"ashab ?ul ?hadith", None, "Lectures & dawah"), (r"miraath", None, "Lectures & dawah"), (r"nida.?al.?islam|نداء الإسلام", "SA", "Islamic talk"),
    (r"\bpeace ?radio\b|\bradio peace\b", "IN", "Islamic talk"), (r"muslim community radio", "AU", "Islamic talk"), (r"alfalah radio", "AU", "Islamic talk"),
    (r"islamic path", "AU", "Islamic talk"), (r"mouslim ?radio", None, "Islamic talk"), (r"radio bilal", "UG", "Islamic talk"), (r"zango fm", "US", "Islamic talk"),
    (r"radyo selam", "TR", "Islamic talk"), (r"kawand", "SN", "Islamic talk"), (r"ummah radio", None, "Islamic talk"), (r"radio islamico", None, "Islamic talk"),
    (r"yaqeen radio", None, "Islamic talk"), (r"islamic radio of canada", "CA", "Islamic talk"), (r"radio islam global", None, "Islamic talk"),
    (r"sampfatis", None, "Islamic talk"), (r"islamic lectures centre", None, "Lectures & dawah"), (r"majelis rasulullah", None, "Islamic talk"),
    (r"kishk|كشك", None, "Lectures & dawah"), (r"sha.?rawi|شعراوي", None, "Lectures & dawah"), (r"abdel ?kafi|عبد الكافي", None, "Lectures & dawah"),
    (r"quran for the heart|القرآن للقلب", None, "Quran"),
]
KNOWN_RX = [(re.compile(p, re.I), cc, cat) for p, cc, cat in KNOWN]


def known(s):
    name, cc = (s.get("name") or "").strip(), (s.get("countrycode") or "").upper()
    for rx, kcc, cat in KNOWN_RX:
        if rx.search(name) and (kcc is None or kcc == cc):
            return rx.pattern, cat
    return None


MUSLIM_CC = set("AF AL AE AZ BA BD BF BH BN DJ DZ EG ER ET GM GN ID IQ JO KE KG KM KW KZ LB LY MA MR ML MV MY NE NG OM PK PS QA SA SD SL SN SO SY TD TJ TM TN TR TZ UZ XK YE".split())


def get_json(url, timeout=300):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
    return json.loads(data)


def servers():
    try:
        names = [s["name"] for s in get_json("https://all.api.radio-browser.info/json/servers", 30) if s.get("name")]
        names = sorted(set(names))
        random.shuffle(names)
        return names or FALLBACK
    except Exception as e:
        print("server list failed:", e)
        return FALLBACK


def all_stations():
    for host in servers():
        try:
            data = get_json(f"https://{host}/json/stations?hidebroken=true&limit=200000")
            print(f"directory: {len(data)} stations from {host}")
            return data
        except Exception as e:
            print(f"{host} failed: {e}")
    sys.exit("could not download the station directory")


def mp3quran():
    out = {}
    for lang in ("eng", "ar"):
        try:
            j = get_json(f"https://mp3quran.net/api/v3/radios?language={lang}", 60)
            for r in j.get("radios", []):
                rid = str(r.get("id"))
                if not rid or not r.get("url"):
                    continue
                o = out.setdefault(rid, {"id": rid, "url": r["url"].strip()})
                o["eng" if lang == "eng" else "ar"] = (r.get("name") or "").strip()
        except Exception as e:
            print(f"mp3quran {lang} failed: {e}")
    print(f"mp3quran: {len(out)} radios")
    return list(out.values())


def text_of(s):
    return " ".join([s.get("name") or "", s.get("tags") or "", s.get("homepage") or ""])


def url_of(s):
    return (s.get("url_resolved") or s.get("url") or "").strip()


def key_url(u):
    return re.sub(r"/+$", "", u.lower())


def sort_key(name):
    return re.sub(r"^[\W\d_]+", "", name or "", flags=re.U).casefold() or (name or "").casefold()


def category(txt):
    for name, rx in CATS:
        if rx.search(txt):
            return name
    return "Islamic talk"


def slim(s, cat, src="radio-browser"):
    u = url_of(s)
    d = {
        "stationuuid": s.get("stationuuid"), "name": (s.get("name") or "").strip(), "url_resolved": u,
        "homepage": s.get("homepage") or "", "favicon": s.get("favicon") or "",
        "tags": ",".join([t for t in (s.get("tags") or "").split(",") if t.strip()][:4]),
        "country": s.get("country") or "", "countrycode": (s.get("countrycode") or "").upper(),
        "language": ((s.get("language") or "").split(",")[0]).strip(), "codec": s.get("codec") or "",
        "bitrate": s.get("bitrate") or 0, "hls": s.get("hls") or 0, "clickcount": s.get("clickcount") or 0,
        "category": cat, "src": src,
    }
    try:
        g = float(s.get("geo_long"))
        if g and -180 <= g <= 180:
            d["geo_long"] = round(g, 2)
    except (TypeError, ValueError):
        pass
    return {k: v for k, v in d.items() if v not in ("", None, 0) or k in ("name", "url_resolved")}


def old_app_count(stations):
    """What the app's earlier live search finds: its queries, then its rules, HTTPS only."""
    https = [s for s in stations if url_of(s).lower().startswith("https://")]
    https.sort(key=lambda s: -(s.get("clickcount") or 0))
    found = []
    for t in OLD_TAGS:
        found += [s for s in https if t in (s.get("tags") or "").lower()][:500]
    for n in OLD_NAMES:
        found += [s for s in https if n in (s.get("name") or "").lower()][:500]
    for c in OLD_CC:
        found += [s for s in https if (s.get("countrycode") or "").upper() == c][:500]
    best, urls = {}, set()
    for s in found:
        txt = (s.get("name") or "") + " " + (s.get("tags") or "")
        if not OLD_RX.search(txt) or OLD_EXC.search(txt) or (s.get("countrycode") or "").upper() == "IR":
            continue
        u = key_url(url_of(s))
        if u in urls:
            continue
        urls.add(u)
        k = sort_key(s.get("name")) + "|" + (s.get("countrycode") or "")
        if k not in best or (s.get("clickcount") or 0) > (best[k].get("clickcount") or 0):
            best[k] = s
    return len(best)


def main():
    stations = all_stations()
    report = {"generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
              "directory_total": len(stations)}
    report["app_before_https"] = old_app_count(stations)

    keep, excluded, near, known_hits, kcat = {}, [], [], {}, {}
    for s in stations:
        txt = text_of(s)
        cc = (s.get("countrycode") or "").upper()
        kn = known(s)
        if kn:
            known_hits.setdefault(kn[0], []).append(s.get("name"))
        tr_dini = cc == "TR" and re.search(r"\bdini\b", s.get("tags") or "", re.I)
        if not (kn or tr_dini or INC.search(txt)):
            if cc in MUSLIM_CC and re.search(r"relig|islam|dini|diin|ديني|دينية", txt, re.I):
                near.append({"name": s.get("name"), "cc": cc, "tags": s.get("tags"), "id": s.get("stationuuid")})
            continue
        if EXC.search(txt) or cc == "IR":
            excluded.append({"name": s.get("name"), "cc": cc, "tags": s.get("tags"), "why": "Iran" if cc == "IR" else (EXC.search(txt).group(0))})
            continue
        u = url_of(s)
        if not u:
            continue
        if kn:
            kcat[s.get("stationuuid")] = kn[1]
        k = sort_key(s.get("name")) + "|" + cc
        old = keep.get(k)
        if old is None or (s.get("clickcount") or 0) > (old.get("clickcount") or 0):
            keep[k] = s

    out, urls = [], set()
    for s in keep.values():
        u = key_url(url_of(s))
        if u in urls:
            continue
        urls.add(u)
        out.append(slim(s, kcat.get(s.get("stationuuid")) or category(text_of(s))))

    for r in mp3quran():
        u = r["url"]
        if key_url(u) in urls:
            continue
        urls.add(key_url(u))
        name = r.get("eng") or r.get("ar") or "Quran radio"
        out.append({"stationuuid": "mp3quran-" + r["id"], "name": name, "aka": r.get("ar", ""),
                    "url_resolved": u, "homepage": "https://mp3quran.net/", "tags": "quran,recitation",
                    "country": "Online", "language": "arabic", "codec": "MP3",
                    "category": "Quran", "src": "mp3quran"})

    out.sort(key=lambda s: sort_key(s["name"]))
    for s in out:
        if not s.get("aka"):
            s.pop("aka", None)

    os.makedirs(os.path.join(OUT, "report"), exist_ok=True)
    with open(os.path.join(OUT, "islamic.json"), "w", encoding="utf-8") as f:
        json.dump({"generated": report["generated"], "count": len(out), "stations": out}, f, ensure_ascii=False, separators=(",", ":"))

    is_https = lambda s: s["url_resolved"].lower().startswith("https://")
    report["new_total"] = len(out)
    report["new_https"] = sum(1 for s in out if is_https(s))
    report["by_source"] = dict(collections.Counter(s["src"] for s in out))
    report["by_category"] = dict(collections.Counter(s["category"] for s in out).most_common())
    report["by_category_https"] = dict(collections.Counter(s["category"] for s in out if is_https(s)).most_common())
    by_cc = collections.defaultdict(lambda: {"all": 0, "https": 0, "country": ""})
    for s in out:
        c = by_cc[s.get("countrycode") or "--"]
        c["all"] += 1
        c["https"] += is_https(s)
        c["country"] = c["country"] or s.get("country", "")
    report["by_country"] = dict(sorted(by_cc.items(), key=lambda kv: -kv[1]["all"]))
    report["excluded_count"] = len(excluded)
    report["known_found"] = {p: n[:3] for p, n in known_hits.items()}
    report["known_missing"] = [p for p, cc, cat in KNOWN if p not in known_hits]

    if os.environ.get("GITHUB_EVENT_NAME") != "schedule":
        with open(os.path.join(OUT, "report", "summary.json"), "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=1)
        with open(os.path.join(OUT, "report", "review.json"), "w", encoding="utf-8") as f:
            json.dump({"excluded": excluded, "near_misses": near}, f, ensure_ascii=False, indent=0)
        index = [{"n": s.get("name"), "c": (s.get("countrycode") or "").upper(), "u": url_of(s), "id": s.get("stationuuid"), "t": (s.get("tags") or "")[:60]}
                 for s in stations if (s.get("countrycode") or "").upper() in MUSLIM_CC]
        with open(os.path.join(OUT, "report", "index.json"), "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({k: report[k] for k in ("directory_total", "app_before_https", "new_total", "new_https", "by_source", "by_category")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
