#!/usr/bin/env python3
"""Keep the designer credit in every HTML page, including later additions.

Run this after the Rased synchronization and for each portal push.
It is idempotent and changes no application data or scripts.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
START = "<!-- alfalah-designer-credit:start -->"
END = "<!-- alfalah-designer-credit:end -->"
NAME = "تصميم محمد عامر أحمد"
SKIP_DIRS = {".git", ".github", "node_modules", "vendor", "dist", "build", "_rased_source"}

def stamp(html: str) -> str:
    if "</body>" not in html.lower():
        return html
    previous = re.compile(r"\n?" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)
    original = previous.sub("", html)
    already_visible = NAME in original
    hide_screen = "display:none!important;" if already_visible else "display:block;"
    snippet = f"""
{START}
<style id="alfalah-designer-credit-style">
#alfalah-designer-credit{{{hide_screen}position:fixed;bottom:8px;left:12px;z-index:2147482000;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.96);color:#195b57;font:600 11px Tahoma,Arial,sans-serif;direction:rtl;text-align:center;box-shadow:0 1px 5px #0002;pointer-events:none}}
@media print {{
 #alfalah-designer-credit{{display:block!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:2147482000!important;background:white!important;color:#333!important;box-shadow:none!important;border-top:1px solid #bbb!important;border-radius:0!important;text-align:center!important;font:600 9pt Tahoma,Arial,sans-serif!important;padding:3px!important}}
}}
</style>
<div id="alfalah-designer-credit" aria-label="{NAME}">{NAME}</div>
{END}
"""
    return re.sub(r"</body>", lambda m: snippet + m.group(), original, count=1, flags=re.I)

def main():
    scanned = changed = 0
    for file in ROOT.rglob("*.html"):
        if any(p in SKIP_DIRS for p in file.relative_to(ROOT).parts):
            continue
        scanned += 1
        before = file.read_text(encoding="utf-8-sig")
        after = stamp(before)
        if before != after:
            file.write_text(after, encoding="utf-8")
            changed += 1
    print(f"Designer credit: scanned {scanned} HTML pages, updated {changed}")

if __name__ == "__main__":
    main()
