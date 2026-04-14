# Quick Commit Reference

## Option 1: Use the Script (Easiest)

### Linux/Mac:
```bash
chmod +x commit-findings-feature.sh
./commit-findings-feature.sh
git push origin main
```

### Windows:
```cmd
commit-findings-feature.bat
git push origin main
```

---

## Option 2: Manual Commands

### Quick One-Liner:
```bash
git add backend/src/controllers/finding.controller.ts backend/src/controllers/evidence.controller.ts backend/src/routes/finding.routes.ts backend/src/routes/evidence.routes.ts backend/src/models/finding.model.ts backend/src/models/evidence.model.ts backend/src/services/openai.service.ts backend/migrations/1775812827009_add-findings-table.sql backend/migrations/1775813000000_add-evidence-versions-logs.sql frontend/src/components/findings/ frontend/src/api/findingApi.ts frontend/src/api/evidenceApi.ts frontend/src/pages/ProjectsPage.tsx *.md && git commit -m "feat: Add AI-assisted finding generation" && git push origin main
```

### Step by Step:
```bash
# 1. Add all files
git add backend/src/controllers/finding.controller.ts
git add backend/src/controllers/evidence.controller.ts
git add backend/src/routes/finding.routes.ts
git add backend/src/routes/evidence.routes.ts
git add frontend/src/components/findings/
git add frontend/src/api/findingApi.ts
git add *.md

# 2. Commit
git commit -m "feat: Add AI-assisted finding generation and evidence management"

# 3. Push
git push origin main
```

---

## Option 3: Add Everything (Use with Caution)

```bash
# Add all changes
git add .

# Review what will be committed
git status

# Commit
git commit -m "feat: Add AI-assisted finding generation"

# Push
git push origin main
```

---

## Verify Before Pushing

```bash
# Check status
git status

# See what will be committed
git diff --cached

# See commit log
git log --oneline -3
```

---

## If Something Goes Wrong

### Undo staging:
```bash
git reset HEAD
```

### Undo last commit (keep changes):
```bash
git reset --soft HEAD~1
```

### Undo last commit (discard changes):
```bash
git reset --hard HEAD~1
```

---

## Create Feature Branch (Recommended)

```bash
# Create and switch to feature branch
git checkout -b feature/ai-findings

# Add and commit
git add <files>
git commit -m "feat: Add AI findings"

# Push to feature branch
git push origin feature/ai-findings

# Then create Pull Request on GitHub
```

---

## Files Summary

**Backend (15 files):**
- Controllers: finding, evidence, project
- Routes: finding, evidence, project
- Models: finding, evidence, project
- Services: openai, version, activity-log
- Migrations: 2 files
- Config: multer

**Frontend (12 files):**
- Components: 9 files (findings + projects)
- API: 3 files
- Pages: 1 file

**Documentation (9 files):**
- Workflow guides
- RBAC documentation
- Quick start guides

**Total: ~36 files, ~7,500 lines of code**
