# Deploying TheCrossWild API to Coolify (prod01)

Moves this backend off Render's free tier and the database off MongoDB Atlas, onto
the self-hosted Coolify server. Server-level facts (SSH, backups, firewall, R2)
live in `SERVER-RUNBOOK.md`; this file is the project-specific walkthrough.

**Current state → target state**

| | Now | After |
|---|---|---|
| API | `crosswild-backend-p5l3.onrender.com` (free tier, sleeps) | `https://api.thecrosswild.com` on prod01 |
| Database | MongoDB Atlas `thecrosswild.j8lzvdi.mongodb.net` | Coolify-managed MongoDB on prod01 |
| Images | Cloudinary | Cloudinary (unchanged) |
| Keep-warm ping | `.github/workflows/keep-warm.yml` every 10 min | no longer needed — a VPS container doesn't sleep |

This is a **copy-then-cut-over** migration. Render and Atlas keep running
untouched until the new stack is verified; nothing is deleted at any step.

---

## 0. Before you start

1. **Commit the lockfile.** `package-lock.json` was gitignored; the Docker build
   runs `npm ci`, which fails without it. `.gitignore` is already fixed, so:
   ```bash
   git add package-lock.json Dockerfile .dockerignore .env.example .gitignore \
           server.js config/database.js scripts/migrate-mongo-to-coolify.sh DEPLOY-COOLIFY.md
   git commit -m "Add Coolify/Docker deployment setup"
   git push origin main
   ```
2. **Generate a production `JWT_SECRET`.** The current `.env` has the placeholder
   `your-secret-...`. Rotating it logs every admin session out once — do it now
   rather than later:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
3. **Verify the image builds locally** (optional but cheap):
   ```bash
   docker build -t crosswild-api . && docker run --rm -p 5000:5000 \
     -e JWT_SECRET=test -e MONGODB_URI="$(grep '^MONGODB_URI=' .env | cut -d= -f2-)" \
     crosswild-api
   curl -s localhost:5000/api/health
   ```

---

## 1. Coolify project + MongoDB

Log in at `https://coolify.araxex.com`.

**Project:** Projects → **+ Add** → `TheCrossWild` → open it → environment `production`.

**Database:** inside the project → **+ New → Database → MongoDB** (v7 or v8).
- Name `crosswild-mongo`, database `thecrosswild`.
- **Leave the generated password alone**; copy it — you need it in step 2.
- **Deploy → wait for Healthy.**
- Open the resource and copy the **Mongo URL (internal)**. The hostname is the
  resource UUID, reachable over the `coolify` Docker network.

> **Connection-string gotcha.** Coolify's internal URL usually has no database
> name and no auth source. Mongoose needs both. Final value for `MONGODB_URI`:
> ```
> mongodb://<user>:<pass>@<resource-uuid>:27017/thecrosswild?authSource=admin&directConnection=true
> ```
> `authSource=admin` because Coolify creates the user in the `admin` database;
> `directConnection=true` because it's a single node, not a replica set.

> **No `mongodb+srv://`** here — that's an Atlas-only DNS-seedlist scheme and it
> will not resolve inside Docker.

---

## 2. Copy the data from Atlas

Needs `mongodb-database-tools` locally (`brew install mongodb-database-tools`)
and your `ssh prod01` access. The script tunnels to the Mongo container over SSH,
so the database is never exposed to the internet.

```bash
export SOURCE_URI='mongodb+srv://admin:<atlas-password>@thecrosswild.j8lzvdi.mongodb.net/thecrosswild'
export TARGET_USER='<coolify mongo user>'
export TARGET_PASS='<coolify mongo password>'
./scripts/migrate-mongo-to-coolify.sh
```

It dumps Atlas → restores into Coolify → diffs per-collection document counts and
prints the result. **Don't continue until the counts match.** The dump stays in
`~/crosswild-mongo-migration/<timestamp>/` so the restore can be re-run.

Restore runs **without `--drop`**: nothing already in the target is removed.

---

## 3. The API application

Project → **+ New → Application → Private Repository (GitHub App)** → the
**adrologic** app → repo `adrologic/crosswild_backend` → branch `main`.

| Setting | Value |
|---|---|
| Build Pack | **Dockerfile** |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `5000` |
| Health Check path / port | `/api/health` · `5000` |

**No persistent storage needed** — uploads use `multer.memoryStorage()` and go
straight to Cloudinary, so nothing is written to the container filesystem.

### Environment variables

App → **Environment Variables**. For **every** variable: **UNCHECK "Build
Variable"** (these are runtime values; build-time bakes secrets into image layers),
and tick **Is Secret** on the four marked below. If Production and Preview columns
are both shown, fill **both**.

| Variable | Value | Secret |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | |
| `MONGODB_URI` | the string built in step 1 | ✅ |
| `JWT_SECRET` | the value generated in step 0 | ✅ |
| `CLOUDINARY_CLOUD_NAME` | from `.env` | |
| `CLOUDINARY_API_KEY` | from `.env` | |
| `CLOUDINARY_API_SECRET` | from `.env` | ✅ |
| `ADMIN_EMAIL` | from `.env` | |
| `ADMIN_PASSWORD` | from `.env` | ✅ |
| `CORS_ORIGIN` | leave empty unless a new admin domain is added | |

`thecrosswild.com`, `www.thecrosswild.com` and `the-cross-wild-admin.vercel.app`
are hardcoded as allowed origins in `server.js`; `CORS_ORIGIN` only *adds* to that
list.

### Domain + TLS

App → **Domains** → `https://api.thecrosswild.com`, then add an **A record** for
`api` in the `thecrosswild.com` zone pointing to `217.216.59.240` (DNS-only, not
proxied — Traefik issues the Let's Encrypt cert and a proxied record breaks the
HTTP-01 challenge).

*Alternative with zero DNS work:* use `https://api.crosswild.araxex.com` — the
`*.araxex.com` wildcard already points at prod01, so the cert issues immediately.

---

## 4. Deploy and verify

**Deploy** → watch **Logs**. A healthy boot prints:

```
🔍 MONGODB_URI is: SET
✅ MongoDB Connected: <resource-uuid>
📦 Database: thecrosswild
🚀 Server is running on port 5000
```

Then, from your machine:

```bash
curl -s https://api.thecrosswild.com/api/health          # database: "connected"
curl -s https://api.thecrosswild.com/api/site-settings   # real CMS data
curl -s "https://api.thecrosswild.com/api/products?limit=1"
curl -s https://api.thecrosswild.com/api/locations?active=true | head -c 300
```

Then log into the admin panel against the new API and confirm an image upload
still lands in Cloudinary.

**If it fails:** the two usual causes are (a) `MONGODB_URI` missing the db name or
`authSource=admin`, and (b) env vars left as **Build Variables**, which makes them
absent at runtime.

---

## 5. Cut the frontends over

Both apps already read the API base from an env var and only *fall back* to the
Render URL, so no code change is required — set the variable and redeploy.

| App | Where | Variable | Value |
|---|---|---|---|
| `TheCrossWild` (Next.js) | Vercel → Settings → Environment Variables | `BACKEND_URL` | `https://api.thecrosswild.com` |
| `TheCrossWildAdmin` (Vite) | Vercel → Settings → Environment Variables | `VITE_API_URL` | `https://api.thecrosswild.com/api` |

`BACKEND_URL` drives the Next.js `/api/:path*` rewrite, `sitemap.ts`,
`layout.tsx` schema fetch and every server-side CMS fetch — one variable covers
all of them. Redeploy both projects (Vite bakes `VITE_*` at build time, so a
redeploy is mandatory for the admin).

Do this **after** step 4 passes. Roll back by clearing the variable and
redeploying — the code falls back to Render, which is still running.

The hardcoded `crosswild-backend-p5l3.onrender.com` fallbacks in the frontend
source are deliberately left in place during cutover. Replace them in a separate
commit once the new API has been stable for a few days.

---

## 6. After cutover

1. **Add MongoDB to the nightly backup.** The server's `backup-nightly.sh`
   discovers databases *by image* and currently only matches `postgres`,
   `timescale` and `redis` — **a Mongo container would not be backed up at all.**
   See `SERVER-RUNBOOK.md` §8 for the snippet to add. Do this before retiring
   Atlas.
2. **Disable the keep-warm workflow.** `.github/workflows/keep-warm.yml` exists
   only because Render's free tier sleeps. Once traffic is on prod01 it's just
   144 pointless CI runs a day — disable it in the Actions tab (left in the repo
   for now, harmless while Render is still up).
3. **Keep Atlas and Render running for ~1–2 weeks** as a rollback path, then
   retire them once the new stack has proven itself and a Mongo backup has been
   verified restorable.
4. **Rotate the Atlas credentials** in your password manager after Atlas is
   retired — they were in a local `.env` (and, per commit `22ba972`, previously in
   git history).
