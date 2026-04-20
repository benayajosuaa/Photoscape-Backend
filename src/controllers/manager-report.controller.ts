import type { Request, Response } from 'express';
import { ManagerReportServices } from '../services/manager-report.service.js';

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getActor(req: Request) {
  if (!req.user?.userId) {
    throw new Error('Unauthorized');
  }

  return {
    userId: req.user.userId,
    role: req.user.role,
    locationId: req.user.locationId ?? null,
  };
}

function getCommonFilters(req: Request) {
  const date = getSingleValue(req.query.date as string | string[] | undefined)?.trim();
  const startDate = getSingleValue(req.query.startDate as string | string[] | undefined)?.trim();
  const endDate = getSingleValue(req.query.endDate as string | string[] | undefined)?.trim();
  const period = getSingleValue(req.query.period as string | string[] | undefined)?.trim();
  const locationId = getSingleValue(req.query.locationId as string | string[] | undefined)?.trim();
  const status = getSingleValue(req.query.status as string | string[] | undefined)?.trim();
  const studioId = getSingleValue(req.query.studioId as string | string[] | undefined)?.trim();
  const serviceType = getSingleValue(req.query.serviceType as string | string[] | undefined)?.trim();
  const method = getSingleValue(req.query.method as string | string[] | undefined)?.trim();
  const action = getSingleValue(req.query.action as string | string[] | undefined)?.trim();
  const page = getSingleValue(req.query.page as string | string[] | undefined)?.trim();
  const limit = getSingleValue(req.query.limit as string | string[] | undefined)?.trim();

  return {
    ...(date ? { date } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(period ? { period } : {}),
    ...(locationId ? { locationId } : {}),
    ...(status ? { status } : {}),
    ...(studioId ? { studioId } : {}),
    ...(serviceType ? { serviceType } : {}),
    ...(method ? { method } : {}),
    ...(action ? { action } : {}),
    ...(page ? { page } : {}),
    ...(limit ? { limit } : {}),
  };
}

function sendError(res: Response, error: any, fallbackMessage: string) {
  console.error(error);
  return res.status(400).json({
    message: error?.message ?? fallbackMessage,
  });
}

export const ManagerReportController = {
  async getFilterOptions(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getFilterOptions(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager filter options loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager filter options');
    }
  },

  async getDailySummary(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getDailySummary(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager daily summary loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager daily summary');
    }
  },

  async getBookings(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getBookings(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager bookings loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager bookings');
    }
  },

  async getStudioUsage(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getStudioUsage(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager studio usage loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager studio usage');
    }
  },

  async getTransactions(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getTransactions(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager transactions loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager transactions');
    }
  },

  async getActivityLogs(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getActivityLogs(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager activity logs loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager activity logs');
    }
  },

  async getPerformance(req: Request, res: Response) {
    try {
      const data = await ManagerReportServices.getPerformanceStats(getActor(req), getCommonFilters(req));
      return res.status(200).json({
        message: 'manager performance loaded',
        data,
      });
    } catch (error: any) {
      return sendError(res, error, 'failed to load manager performance');
    }
  },
};
