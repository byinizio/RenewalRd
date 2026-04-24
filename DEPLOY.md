# RenewalRadar — Complete Deployment Guide
## From Zero to Live in ~45 Minutes

---

## STEP 1: Supabase (Database) — ~10 min

1. Go to **https://supabase.com** → Create new project
   - Name: `renewalradar`
   - DB password: save this somewhere safe
   - Region: pick closest to your users

2. Wait for project to spin up (~2 min)

3. Go to **SQL Editor** (left sidebar) → New Query

4. Paste the entire contents of `supabase/schema.sql` → Click **Run**
   - You should see: "Success. No rows returned"

5. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → this is your `SUPABASE_SERVICE_ROLE_KEY`
   ⚠️  Never expose `service_role` key publicly

---

## STEP 2: Get API Keys — ~10 min

### Twitter/X Bearer Token (FREE)
1. Go to **https://developer.twitter.com/en/portal/dashboard**
2. Create a new project + app (free tier)
3. Go to your app → **Keys and Tokens**
4. Copy **Bearer Token** → `TWITTER_BEARER_TOKEN`
   - Free tier: 500K tweet reads/month — enough for 100+ agencies

### OpenAI API Key (~$0.0006 per analysis)
1. Go to **https://platform.openai.com/api-keys**
2. Create new key → `OPENAI_API_KEY`
3. Add $5 credit (covers ~8,000 client analyses)

### Resend API Key (FREE — 3,000 emails/month)
1. Go to **https://resend.com** → Sign up
2. Dashboard → **API Keys** → Create API Key
3. Copy key → `RESEND_API_KEY`
4. (Optional) Verify your own domain for better deliverability

---

## STEP 3: Local Setup — ~5 min

```bash
# Clone / create your repo
git init renewalradar
cd renewalradar
# Copy all files into this directory

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in all values in .env.local

# Test locally
npm run dev
# Open http://localhost:3000
```

### Test the signup flow locally:
1. Open http://localhost:3000
2. Fill in the signup form
3. Check Supabase → Table Editor → agencies to see your row
4. Check your email for the welcome message

---

## STEP 4: Deploy to Vercel — ~5 min

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: renewalradar
# - Directory: ./
# - Override settings? No

# Set all environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add OPENAI_API_KEY
vercel env add TWITTER_BEARER_TOKEN
vercel env add NEXT_PUBLIC_APP_URL
vercel env add CRON_SECRET

# For CRON_SECRET, generate a random string:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Deploy to production
vercel --prod
```

Or via Vercel Dashboard:
1. **https://vercel.com** → New Project → Import Git Repository
2. Add all env vars in **Settings → Environment Variables**
3. Deploy

---

## STEP 5: GitHub Repo + Actions (Cron) — ~10 min

```bash
# Push to GitHub
git add .
git commit -m "Initial RenewalRadar build"
git remote add origin https://github.com/YOURUSERNAME/renewalradar.git
git push -u origin main
```

### Add GitHub Secrets (for Actions):
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add ALL of these:
```
SUPABASE_URL          = https://your-project.supabase.co
SUPABASE_ANON_KEY     = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
RESEND_API_KEY        = re_your_key
OPENAI_API_KEY        = sk-your-key
TWITTER_BEARER_TOKEN  = your-bearer-token
APP_URL               = https://your-app.vercel.app
```

### Verify the cron works:
1. Go to **Actions** tab in your GitHub repo
2. Click **Daily Client Risk Analysis**
3. Click **Run workflow** → **Run workflow** (manual trigger)
4. Watch the logs — should complete in ~30 seconds
5. Check your email for the digest

---

## STEP 6: Add Your First Client — ~2 min

1. Open `https://your-app.vercel.app/dashboard?agency=YOUR_AGENCY_ID`
   (agency ID is in the URL from the thank-you page after signup)

2. Click **+ Add New Client**
   - Name: your client's brand name
   - Monthly Retainer: actual dollar amount
   - Industry: pick closest

3. On the client card, click **+ Account**
   - Platform: Twitter
   - Handle: @theirhandle (no @ needed)
   - Access Token: leave blank for public accounts

4. Trigger a manual analysis:
   - GitHub Actions → Daily Client Risk Analysis → Run workflow
   - OR: visit `https://your-app.vercel.app/api/cron/process?secret=YOUR_CRON_SECRET`

5. Check your email. First report arrives!

---

## STEP 7: Go Live — Checklist

```
□ Supabase project created, schema.sql executed
□ All 3 API keys obtained (Twitter, OpenAI, Resend)
□ .env.local filled in, npm run dev works locally
□ Deployed to Vercel, env vars set
□ GitHub repo created, all 8 secrets added
□ GitHub Actions test run completed successfully
□ Welcome email received after signup
□ First client added with Twitter account
□ First digest email received
□ Manual cron trigger works
□ Custom domain added (optional: renewalradar.io)
```

---

## MONITORING & SCALING

### Free Tier Limits (at launch):
| Service | Limit | Hits at... |
|---------|-------|-----------|
| Supabase | 500MB storage | ~500 agencies |
| Resend | 3,000 emails/mo | ~100 agencies |
| OpenAI | ~$5/mo at $0.0006/analysis | ~8,000 analyses |
| Twitter API | 500K reads/mo | ~200 clients |
| GitHub Actions | 2,000 min/mo | ~1,000 runs |
| Vercel | 100GB bandwidth | Very high |

### Upgrade Trigger ($1,000 MRR = ~13 customers):
```bash
# Supabase Pro: $25/mo — no pauses, 8GB, daily backups
# Resend Pro: $20/mo — 50K emails, dedicated IP
# Twitter API Basic: $100/mo — higher rate limits
# Total upgrade cost: ~$145/mo, covers 100+ agencies
```

### Adding LinkedIn + Instagram Later:
1. `src/lib/linkedin.ts` — already written, needs OAuth flow
2. `src/lib/instagram.ts` — already written, needs Business account tokens
3. Add OAuth routes in `src/app/api/oauth/` for each platform

---

## COMMON ISSUES

### "Supabase project is paused"
- The keep-alive cron runs every 6h — if it fails, manually ping:
```bash
curl -X POST "https://your-project.supabase.co/rest/v1/keep_alive" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"id":1,"last_ping":"2024-01-01T00:00:00Z"}'
```

### "Twitter API returning 401"
- Bearer token likely has trailing whitespace — copy again carefully
- Make sure your Twitter app has "Read" permissions

### "OpenAI returning 429"
- You've hit rate limits — add $5 more credit or wait
- GPT-4o-mini has generous limits, this is rare at < 50 clients

### "Emails landing in spam"
- Resend's `onboarding@resend.dev` domain is shared — add your own domain
- In Resend: Domains → Add domain → verify DNS records
- Update `from` in `src/lib/resend.ts` to `noreply@yourdomain.com`

### Dashboard shows "Agency not found"
- Agency ID in URL is wrong — check Supabase → agencies table for correct UUID
- Or sign up again with a different email

---

## REVENUE PATH

```
Week 1:  Sign up yourself, add all your clients → validate the product works
Week 2:  Share in r/agency, r/socialmedia → aim for 3 beta users (free)
Week 3:  First paid user at $79/mo → costs you ~$0.50/mo to serve
Month 2: 13 users × $79 = $1,027/mo → upgrade to paid tiers ($145/mo)
Month 4: 25 users × $79 = $1,975/mo → hire VA for support
Month 6: Launch white-label tier at $199/mo → 10 white-label = $1,990/mo
```

**Total build cost to reach $1K MRR: ~$6 (just OpenAI)**
