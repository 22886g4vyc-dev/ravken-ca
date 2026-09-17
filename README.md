# ravken.ca — splash page

The public holding page for Ravken Environmental Solutions Inc.
Served by GitHub Pages. This repo is public because everything in it
is served publicly anyway.

**Source of truth:** this page is generated from `Website/_splash/` in the
private `ravken-site` repo. Edit it there, re-run the audit, then copy across.

**Pre-deploy gate — must pass before any change ships:**

    cd "09_Systems and IT/Site Audit" && python3 review_site.py "../Website/_splash"

Exits non-zero on any failure. Last run: 16 passed, 0 warnings, 0 failures.

The full site (services, about, contact) is deliberately not published yet.
