import type { Request, Response } from "express";
import { OperationsReportServices } from "../services/operations-report.service.js";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthenticatedActor(req: Request) {
  if (!req.user?.userId) {
    throw new Error("Unauthorized");
  }

  return {
    locationId: req.user.locationId ?? null,
    role: req.user.role,
    userId: req.user.userId,
  };
}

function getCommonFilters(req: Request) {
  const endDate = getSingleValue(req.query.endDate as string | string[] | undefined)?.trim();
  const locationId = getSingleValue(req.query.locationId as string | string[] | undefined)?.trim();
  const packageId = getSingleValue(req.query.packageId as string | string[] | undefined)?.trim();
  const startDate = getSingleValue(req.query.startDate as string | string[] | undefined)?.trim();
  const studioId = getSingleValue(req.query.studioId as string | string[] | undefined)?.trim();

  return {
    ...(endDate ? { endDate } : {}),
    ...(locationId ? { locationId } : {}),
    ...(packageId ? { packageId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(studioId ? { studioId } : {}),
  };
}

function sendError(res: Response, error: any, fallbackMessage: string) {
  console.error(error);
  return res.status(400).json({
    message: error?.message ?? fallbackMessage,
  });
}

export const OperationsReportController = {
  async getDashboardSummary(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const data = await OperationsReportServices.getDashboardSummary(actor, getCommonFilters(req));

      return res.status(200).json({
        message: "dashboard summary loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load dashboard summary");
    }
  },

  async getBookingReport(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingStatus = getSingleValue(req.query.bookingStatus as string | string[] | undefined)?.trim();
      const data = await OperationsReportServices.getBookingReport(actor, {
        ...getCommonFilters(req),
        ...(bookingStatus ? { bookingStatus } : {}),
      });

      return res.status(200).json({
        message: "booking report loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load booking report");
    }
  },

  async getStudioUsageReport(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const groupBy = getSingleValue(req.query.groupBy as string | string[] | undefined)?.trim();
      const data = await OperationsReportServices.getStudioUsageReport(actor, {
        ...getCommonFilters(req),
        ...(groupBy ? { groupBy } : {}),
      });

      return res.status(200).json({
        message: "studio usage report loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load studio usage report");
    }
  },

  async getPaymentReport(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const paymentMethod = getSingleValue(req.query.paymentMethod as string | string[] | undefined)?.trim();
      const paymentStatus = getSingleValue(req.query.paymentStatus as string | string[] | undefined)?.trim();
      const data = await OperationsReportServices.getPaymentReport(actor, {
        ...getCommonFilters(req),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      });

      return res.status(200).json({
        message: "payment report loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load payment report");
    }
  },

  async getPerformanceReport(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const data = await OperationsReportServices.getPerformanceReport(actor, getCommonFilters(req));

      return res.status(200).json({
        message: "performance report loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load performance report");
    }
  },

  async getAdminActivityReport(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const action = getSingleValue(req.query.action as string | string[] | undefined)?.trim();
      const adminId = getSingleValue(req.query.adminId as string | string[] | undefined)?.trim();
      const data = await OperationsReportServices.getAdminActivityReport(actor, {
        ...getCommonFilters(req),
        ...(action ? { action } : {}),
        ...(adminId ? { adminId } : {}),
      });

      return res.status(200).json({
        message: "admin activity report loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load admin activity report");
    }
  },
};
