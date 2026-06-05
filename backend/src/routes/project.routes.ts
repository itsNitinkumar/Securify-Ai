import { Router } from 'express';
import { NextFunction, Response } from 'express';
import ProjectController from '../controllers/project.controller';
import { protect, authorize, authorizeProjectAccess } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import UserModel from '../models/user.model';
import ProjectModel from '../models/project.model';

const router = Router();

// All routes require authentication
router.use(protect);

// Middleware: allows edit if user has edit_projects OR is the assigned reporter
const canEditProject = asyncHandler(async (req: any, _res: Response, next: NextFunction) => {
  const permissions = req.permissions || await UserModel.getPermissions(req.user.id);
  req.permissions = permissions;

  if (permissions.includes(Permissions.EDIT_PROJECTS)) return next();

  if (permissions.includes(Permissions.CREATE_FINDINGS)) {
    const id = parseInt(req.params.id);
    if (!isNaN(id)) {
      const project = await ProjectModel.findById(id);
      if (project && project.assigned_reporter_id === req.user.id) return next();
    }
  }

  throw new ApiError(403, 'Access denied. Insufficient permissions.');
});

// Middleware: allows workflow action if user has create_findings OR is manager/admin
const canPerformWorkflowAction = asyncHandler(async (req: any, _res: Response, next: NextFunction) => {
  const permissions = req.permissions || await UserModel.getPermissions(req.user.id);
  req.permissions = permissions;

  // Manager/Admin can perform all workflow actions
  if (permissions.includes(Permissions.APPROVE_FINDINGS) || permissions.includes('manage_roles' as any)) return next();

  // Reporter can submit for review (on assigned projects)
  if (permissions.includes(Permissions.CREATE_FINDINGS)) {
    const id = parseInt(req.params.id);
    if (!isNaN(id)) {
      const project = await ProjectModel.findById(id);
      if (project && project.assigned_reporter_id === req.user.id) return next();
    }
  }

  throw new ApiError(403, 'Access denied. Insufficient permissions.');
});

// CRUD operations
router.post('/', authorize(Permissions.CREATE_PROJECTS), ProjectController.createProject);
router.get('/', authorize(Permissions.VIEW_PROJECTS), ProjectController.getAllProjects);
router.get('/:id', authorize(Permissions.VIEW_PROJECTS), authorizeProjectAccess('id'), ProjectController.getProject);
router.get('/:id/with-findings', authorize(Permissions.VIEW_PROJECTS), authorizeProjectAccess('id'), ProjectController.getProjectWithFindings);
router.get('/:id/review-bundle', authorize(Permissions.VIEW_PROJECTS), authorizeProjectAccess('id'), ProjectController.getReviewBundle);
router.put('/:id', canEditProject, authorizeProjectAccess('id'), ProjectController.updateProject);
router.patch('/:id/assign-reporter', authorize(Permissions.ASSIGN_PROJECTS), ProjectController.assignReporter);
router.delete('/:id', authorize(Permissions.DELETE_PROJECTS), ProjectController.deleteProject);

// Workflow operations
router.post('/:id/submit-review', canPerformWorkflowAction, authorizeProjectAccess('id'), ProjectController.submitForReview);
router.post('/:id/request-changes', authorize(Permissions.APPROVE_FINDINGS), authorizeProjectAccess('id'), ProjectController.requestChanges);
router.post('/:id/mark-complete', authorize(Permissions.APPROVE_FINDINGS), authorizeProjectAccess('id'), ProjectController.markComplete);
router.get('/:id/workflow-history', authorize(Permissions.VIEW_PROJECTS), authorizeProjectAccess('id'), ProjectController.getWorkflowHistory);

export default router;
