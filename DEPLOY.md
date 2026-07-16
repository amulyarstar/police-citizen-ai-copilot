# Deploying this for a live demo

The app runs with zero setup (see README), but a **local SQLite file and
in-memory sensor store won't survive Vercel's serverless functions** — each
request can hit a fresh instance, so data would appear to randomly vanish
mid-demo. For anything you're showing live, spend the ~10 minutes below on
free-tier Postgres + Qdrant first.

Total cost: **$0** (all free tiers, no credit card required for Neon/Qdrant
Cloud). Total time: ~15 minutes if you're starting from nothing.

## 1. Push the code to GitHub

```bash
cd police-citizen-ai-copilot
git init
git add .
git commit -m "Initial build"
gh repo create police-citizen-ai-copilot --public --source=. --push
# or: create a repo on github.com and follow its "push an existing repo" instructions
```

## 2. Get a free Postgres database (~2 min)

1. Go to **[neon.tech](https://neon.tech)** → sign up (GitHub login is fastest).
2. Create a project (any name/region).
3. On the project dashboard, copy the **connection string** — it looks like
   `postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`.
4. Keep this tab open — you'll paste it into Vercel in step 5.

*(Supabase works identically if you prefer it — Project Settings → Database
→ Connection string.)*

## 3. Get a free Qdrant Cloud cluster (~3 min)

1. Go to **[cloud.qdrant.io](https://cloud.qdrant.io)** → sign up.
2. Create a **free cluster** (1GB, no card needed).
3. Once it's provisioned, copy the **Cluster URL** (`https://xxxx.cloud.qdrant.io`)
   and generate/copy an **API key** from the cluster's API Keys tab.

## 4. Get an LLM API key (~1 min)

Pick one:
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys) → Create key

Either works — the app auto-detects which one you set. Without this, complaint
extraction runs on the heuristic parser instead of a real LLM, which is fine
for a quick demo but noticeably less impressive to a technical audience.

## 5. Deploy to Vercel (~3 min)

1. Go to **[vercel.com/new](https://vercel.com/new)** → sign in with GitHub →
   import the repo you just pushed.
2. Before clicking Deploy, expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 2 |
   | `QDRANT_URL` | the Qdrant cluster URL from step 3 |
   | `QDRANT_API_KEY` | the Qdrant API key from step 3 |
   | `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) | the key from step 4 |

3. Click **Deploy**. ~90 seconds later you have a live URL.
4. Open the deployed URL — the status bar at the top of the page should now
   read `Storage: Postgres (live)`, `Sensor search: Qdrant (live)`,
   `Extraction: LLM (live)`.

## 6. Seed the live Qdrant instance

Run this **once**, locally, pointed at your production Qdrant (it upserts —
safe to re-run):

```bash
QDRANT_URL=https://xxxx.cloud.qdrant.io QDRANT_API_KEY=your-key npm run seed
```

## 7. Optional: real guardrails (Enkrypt AI)

1. Go to **[app.enkryptai.com](https://app.enkryptai.com)** → sign up → grab
   an API key.
2. Add `ENKRYPT_API_KEY` to your Vercel project's environment variables
   (Project → Settings → Environment Variables) and redeploy.
3. The status bar should now read `Guardrails: Enkrypt AI (live)`.

This is the one integration worth doing last, right before you present —
it's the least load-bearing for the demo narrative and the mock shield
behaves identically from a UI standpoint (blocks injection attempts, redacts
PII), so there's no rush.

## Troubleshooting

- **Status bar still shows fallback mode after deploying**: env vars only
  apply to new deployments — trigger a redeploy from the Vercel dashboard
  after adding/changing them.
- **Qdrant connection errors**: double check there's no trailing slash on
  `QDRANT_URL`.
- **Postgres SSL errors**: Neon's connection string already includes
  `sslmode=require`; if you're on a provider that doesn't, the code assumes
  SSL is needed and disables certificate verification for convenience — fine
  for a hackathon demo, not something to carry into a real deployment as-is
  (see PITCH_NOTES.md).
