import type { Request, Response } from "express";
import { AdminBookingServices, type AdminActor } from "../services/admin-booking.service.js";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthenticatedActor(req: Request): AdminActor {
  if (!req.user?.userId) {
    throw new Error("Unauthorized");
  }

  return {
    locationId: req.user.locationId ?? null,
    locationName: req.user.locationName ?? null,
    role: req.user.role,
    userId: req.user.userId,
  };
}

function sendError(res: Response, error: any, fallbackMessage: string) {
  console.error(error);
  const message = error?.message ?? fallbackMessage;
  const status =
    message === "Booking tidak ditemukan" || message === "Jadwal tujuan tidak ditemukan" ? 404 : 400;

  return res.status(status).json({ message });
}

export const AdminBookingController = {
  async getBookings(req: Request, res: Response) {
    try {
      const date = getSingleValue(req.query.date as string | string[] | undefined)?.trim();
      const search = getSingleValue(req.query.search as string | string[] | undefined)?.trim();
      const status = getSingleValue(req.query.status as string | string[] | undefined)?.trim();
      const actor = getAuthenticatedActor(req);
      const data = await AdminBookingServices.getBookings(actor, {
        ...(date ? { date } : {}),
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      });

      return res.status(200).json({
        message: "admin bookings loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load bookings");
    }
  },

  async getBookingDetail(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.getBookingDetail(actor, bookingId);

      return res.status(200).json({
        message: "booking detail loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load booking detail");
    }
  },

  async getBookingLogs(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.getBookingLogs(actor, bookingId);

      return res.status(200).json({
        message: "booking logs loaded",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to load booking logs");
    }
  },

  async updateBooking(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.updateBooking(actor, bookingId, req.body);

      return res.status(200).json({
        message: "booking updated",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to update booking");
    }
  },

  async rescheduleBooking(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.rescheduleBooking(actor, bookingId, req.body);

      return res.status(200).json({
        message: "booking rescheduled",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to reschedule booking");
    }
  },

  async cancelBooking(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.cancelBooking(actor, bookingId, req.body);

      return res.status(200).json({
        message: "booking cancelled",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to cancel booking");
    }
  },

  async updateBookingStatus(req: Request, res: Response) {
    try {
      const actor = getAuthenticatedActor(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await AdminBookingServices.updateBookingStatus(actor, bookingId, req.body);

      return res.status(200).json({
        message: "booking status updated",
        data,
      });
    } catch (error: any) {
      return sendError(res, error, "failed to update booking status");
    }
  },

};
