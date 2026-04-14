#!/bin/bash

# Commit AI Findings & Evidence Feature
# This script adds and commits all files related to the AI findings feature

echo "🚀 Committing AI Findings & Evidence Feature..."
echo ""

# Backend Files
echo "📦 Adding backend files..."
git add backend/src/controllers/finding.controller.ts
git add backend/src/controllers/evidence.controller.ts
git add backend/src/controllers/project.controller.ts
git add backend/src/routes/finding.routes.ts
git add backend/src/routes/evidence.routes.ts
git add backend/src/routes/project.routes.ts
git add backend/src/models/finding.model.ts
git add backend/src/models/evidence.model.ts
git add backend/src/models/project.model.ts
git add backend/src/services/openai.service.ts
git add backend/src/services/version.service.ts
git add backend/src/services/activity-log.service.ts
git add backend/migrations/1775812827009_add-findings-table.sql
git add backend/migrations/1775813000000_add-evidence-versions-logs.sql
git add backend/src/config/multer.ts

# Frontend Files
echo "🎨 Adding frontend files..."
git add frontend/src/components/findings/AIGenerateDialog.tsx
git add frontend/src/components/findings/CreateFindingDialog.tsx
git add frontend/src/components/findings/EditFindingDialog.tsx
git add frontend/src/components/findings/EvidenceUploader.tsx
git add frontend/src/components/findings/FindingViewer.tsx
git add frontend/src/components/findings/FindingWorkflowButtons.tsx
git add frontend/src/components/projects/ProjectCard.tsx
git add frontend/src/components/projects/ProjectDetailDialog.tsx
git add frontend/src/components/projects/CreateProjectDialog.tsx
git add frontend/src/api/findingApi.ts
git add frontend/src/api/evidenceApi.ts
git add frontend/src/api/projectApi.ts
git add frontend/src/pages/ProjectsPage.tsx

# Documentation
echo "📚 Adding documentation..."
git add COMPLETE_APPLICATION_FLOW.md
git add FINDING_WORKFLOW.md
git add WORKFLOW_COMPARISON.md
git add QUICK_START_FINDINGS.md
git add WORKFLOW_FIX_SUMMARY.md
git add EVIDENCE_WORKFLOW_DIAGRAM.md
git add AI_GENERATION_FIX.md
git add EDIT_FINDING_FEATURE.md
git add RBAC_PROJECT_FIXES.md
git add GIT_COMMIT_GUIDE.md

echo ""
echo "✅ Files staged successfully!"
echo ""
echo "📝 Files to be committed:"
git status --short

echo ""
echo "💬 Committing with message..."
git commit -m "feat: Add AI-assisted finding generation and evidence management

Features:
- AI-powered finding generation using OpenAI
- Evidence upload and management (screenshots, logs, scan results)
- Complete finding workflow (draft → review → approve)
- Version control for findings
- RBAC for analysts, reviewers, and managers
- Project management with finding tracking
- Edit finding functionality
- Evidence-first workflow (upload evidence before AI generation)

Backend:
- Finding CRUD operations with AI generation
- Evidence upload with file validation
- Version tracking for audit trail
- Activity logging for all actions
- Proper RBAC enforcement on all endpoints

Frontend:
- AIGenerateDialog with 3-step workflow
- EvidenceUploader with drag-and-drop
- FindingViewer with all sections
- EditFindingDialog for modifications
- FindingWorkflowButtons for status management
- ProjectDetailDialog with RBAC

Documentation:
- Complete workflow documentation
- RBAC matrix and guidelines
- Quick start guide for users
- Workflow comparison diagrams"

echo ""
echo "✅ Commit successful!"
echo ""
echo "🚀 Ready to push? Run:"
echo "   git push origin main"
echo ""
echo "Or create a feature branch:"
echo "   git checkout -b feature/ai-findings"
echo "   git push origin feature/ai-findings"
