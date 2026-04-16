import type { Request, Response } from "express";
import { BookingServices } from "../services/booking.service.js";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthenticatedUserId(req: Request) {
  if (!req.user?.userId) {
    throw new Error("Unauthorized");
  }

  return req.user.userId;
}

export const BookingController = {
  async getMeta(req: Request, res: Response) {
    try {
      const locationId = getSingleValue(req.query.locationId as string | string[] | undefined)?.trim();
      const studioType = getSingleValue(req.query.studioType as string | string[] | undefined)?.trim();

      const data = await BookingServices.getMeta({
        ...(locationId ? { locationId } : {}),
        ...(studioType ? { studioType } : {}),
      });

      return res.status(200).json({
        message: "booking meta loaded",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to load booking meta",
      });
    }
  },

  async getAvailability(req: Request, res: Response) {
    try {
      const data = await BookingServices.getAvailability({
        date: String(req.query.date ?? ""),
        locationId: String(req.query.locationId ?? ""),
        packageId: String(req.query.packageId ?? ""),
        studioType: String(req.query.studioType ?? ""),
      });

      return res.status(200).json({
        message: "availability loaded",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to load availability",
      });
    }
  },

  async createBooking(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const data = await BookingServices.createBooking(userId, req.body);

      return res.status(201).json({
        message: "booking created",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to create booking",
      });
    }
  },

  async getSummary(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.getSummary(userId, bookingId);

      return res.status(200).json({
        message: "booking summary loaded",
        data,
      });
    } catch (error: any) {
      console.error(error);
      const status = error.message === "Booking tidak ditemukan" ? 404 : 400;

      return res.status(status).json({
        message: error.message ?? "failed to load booking summary",
      });
    }
  },

  async createPayment(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.createPayment(userId, bookingId, req.body?.method);

      return res.status(200).json({
        message: "payment created",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to create payment",
      });
    }
  },

  async showQrisPaymentPage(req: Request, res: Response) {
    try {
      const paymentId = getSingleValue(req.params.paymentId)?.trim() ?? "";
      const html = await BookingServices.getQrisPaymentPage(paymentId);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (error: any) {
      console.error(error);
      return res.status(400).send(`<h1>${error.message ?? "QRIS page error"}</h1>`);
    }
  },

  async confirmQrisPaymentPage(req: Request, res: Response) {
    try {
      const paymentId = getSingleValue(req.params.paymentId)?.trim() ?? "";
      const html = await BookingServices.confirmQrisPaymentFromPage(paymentId);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (error: any) {
      console.error(error);
      return res.status(400).send(`<h1>${error.message ?? "QRIS confirmation error"}</h1>`);
    }
  },

  async confirmPayment(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.confirmPayment(userId, bookingId);

      return res.status(200).json({
        message: "payment confirmed",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to confirm payment",
      });
    }
  },

  async getTicket(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.getTicket(userId, bookingId);

      return res.status(200).json({
        message: "ticket loaded",
        data,
      });
    } catch (error: any) {
      console.error(error);
      const status = error.message === "Booking tidak ditemukan" ? 404 : 400;

      return res.status(status).json({
        message: error.message ?? "failed to load ticket",
      });
    }
  },

  async sendTicketInvoiceEmail(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.sendTicketInvoiceEmail(userId, bookingId);

      return res.status(200).json({
        message: "invoice sent",
        data,
      });
    } catch (error: any) {
      console.error(error);
      const status = error.message === "Booking tidak ditemukan" ? 404 : 400;

      return res.status(status).json({
        message: error.message ?? "failed to send invoice",
      });
    }
  },

  async cancelBooking(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
      const data = await BookingServices.cancelBooking(userId, bookingId, req.body);

      return res.status(200).json({
        message: "booking cancelled",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to cancel booking",
      });
    }
  },
};
