import { Request, Response } from 'express';
import ClientModel from '../models/client.model';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

class ClientController {
  static listClients = asyncHandler(async (_req: Request, res: Response) => {
    const clients = await ClientModel.findAll();
    res.json({ success: true, data: clients });
  });

  // Manager-only. Creates a client if missing (name unique).
  static createClient = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body || {};
    const user = (req as any).user;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Client name is required');
    }

    if (!user || user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can create clients');
    }

    const created = await ClientModel.create({ name: String(name), created_by: user.id });

    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_CLIENT',
      entity_type: 'client',
      entity_id: created.id,
      details: { name: created.name },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, data: created });
  });
}

export default ClientController;
