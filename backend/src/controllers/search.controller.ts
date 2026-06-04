import { Request, Response } from 'express';
import SearchModel from '../models/search.model';
import OpenAIService from '../services/openai.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

const DEFAULT_PAGE_SIZE = 20;

class SearchController {
  static search = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;
    const user = (req as any).user;
    const limit = Math.min(parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    if (!query || !query.trim()) {
      throw new ApiError(400, 'Query is required');
    }

    // 1. AI extracts intent (entity, action, filters)
    let parsed: any;
    try {
      parsed = await OpenAIService.naturalLanguageSearch(
        query,
        user.role,
        user.id,
        user.company_id || null
      );
    } catch (aiErr: any) {
      console.error('AI Search parsing failed:', aiErr.message);
      // Fallback: treat entire query as a global text search
      parsed = { entity: '', action: 'list', filters: { search: query } };
    }

    const entity = parsed.entity || '';
    const action = parsed.action || 'list';
    const filters = parsed.filters || {};

    let results: any[] = [];
    let analytics: any = null;

    const isAnalytics = ['count', 'average', 'most_common', 'highest', 'lowest', 'group'].includes(action);
    const isList = action === 'list';

    // 2. Always run analytics if action is an analytics type
    if (isAnalytics) {
      try {
        analytics = await SearchModel.runAnalytics(
          filters, entity, action, user.id, user.role, user.company_id || null
        );
      } catch (analyticsErr: any) {
        console.error('Analytics query failed:', analyticsErr.message);
        analytics = {};
      }
    }

    // 3. Search for result cards (for list actions, or as supplementary data for analytics)
    if (isList || isAnalytics) {
      try {
        if (entity === 'projects') {
          results = await SearchModel.searchProjects(filters, user.id, user.role, user.company_id || null, limit, offset);
        } else if (entity === 'findings' || entity === 'true_positive' || entity === 'false_positive') {
          results = await SearchModel.searchFindings(filters, user.id, user.role, user.company_id || null, limit, offset);
        } else if (entity === 'reporters') {
          if (!filters.role) filters.role = 'reporter';
          results = await SearchModel.searchUsers(filters, user.id, user.role, user.company_id || null, limit, offset);
        } else if (entity === 'users') {
          results = await SearchModel.searchUsers(filters, user.id, user.role, user.company_id || null, limit, offset);
        } else if (entity === 'clients') {
          results = await SearchModel.searchClients(filters, user.id, user.role, user.company_id || null);
        } else if (entity === 'templates') {
          results = await SearchModel.searchTemplates(filters);
        } else if (entity === 'comments' || entity === 'evidence' || entity === 'references') {
          results = await SearchModel.searchAll(filters.search || query, user.id, user.role, user.company_id || null);
        } else {
          const searchText = filters.search || query;
          results = await SearchModel.searchAll(searchText, user.id, user.role, user.company_id || null);
        }
      } catch (searchErr: any) {
        console.error('Search query failed:', searchErr.message);
        results = [];
      }

      // Supplement with global search if few results
      if (results.length < 5 && !entity) {
        try {
          const broad = await SearchModel.searchAll(
            filters.search || query, user.id, user.role, user.company_id || null
          );
          if (broad.length > results.length) {
            const existingIds = new Set(results.map((r: any) => `${r._entity || entity}-${r.id}`));
            for (const item of broad) {
              const key = `${item._entity || entity}-${item.id}`;
              if (!existingIds.has(key)) {
                results.push(item);
                existingIds.add(key);
              }
            }
          }
        } catch { /* silent */ }
      }
    }

    try {
      await SearchModel.saveHistory(user.id, query, entity, filters);
    } catch { /* silent */ }

    res.json({
      success: true,
      entity,
      action,
      parsed,
      results,
      analytics,
      count: results.length,
    });
  });

  static suggestions = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const suggestions = await SearchModel.getSuggestions(
      user.id, user.role, user.company_id || null
    );
    res.json({ success: true, data: suggestions });
  });

  static getHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await SearchModel.getHistory(user.id, limit);
    res.json({ success: true, data: history });
  });

  static clearHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    await SearchModel.clearHistory(user.id);
    res.json({ success: true, message: 'Search history cleared' });
  });
}

export default SearchController;
