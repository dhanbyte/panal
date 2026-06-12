# 🔀 MERGE BRANCH & DEPLOY

## ✅ New Branch Created: `deploy-branch`

All code is now in `deploy-branch` instead of `main`.

---

## 🚀 STEPS TO MERGE & DEPLOY:

### STEP 1: Merge on GitHub
1. Go to: https://github.com/dhanbyte/panal/pull/new/deploy-branch
2. Click **Create pull request**
3. Title: "Deploy to production"
4. Click **Create pull request**
5. Click **Merge pull request**
6. Click **Confirm merge**
7. Done! Code merged to main ✅

---

### STEP 2: Change Vercel Branch (IMPORTANT)

**Option A: Change Production Branch in Vercel**
1. Go to Vercel dashboard
2. Select your project
3. Click **Settings**
4. Click **Git**
5. Under **Production Branch**, change to: `deploy-branch`
6. Click **Save**
7. Go to **Deployments**
8. Click **Redeploy**

**Option B: Keep using main branch**
- Just merge the PR (Step 1)
- Vercel will auto-deploy from main
- Done!

---

## 🎯 RECOMMENDED: Just Merge PR

1. Merge PR on GitHub (Step 1 above)
2. Vercel will auto-deploy from `main` branch
3. Done! ✅

---

## 📌 Branch Info:

- **deploy-branch**: Latest code (just created)
- **main**: Old code (will update after merge)

**After merge, both will have same code!**

---

## 🔄 Future Updates:

### To push updates:
```bash
# Switch to deploy-branch
git checkout deploy-branch

# Make changes...

# Commit and push
git add .
git commit -m "Update"
git push origin deploy-branch

# Then merge on GitHub
```

---

## ✅ SIMPLEST WAY:

1. **Merge PR**: https://github.com/dhanbyte/panal/pull/new/deploy-branch
2. Vercel auto-deploys
3. Done! 🚀

---

**PR link ready - just merge it!**
