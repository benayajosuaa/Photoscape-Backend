import type { Request, Response } from "express";
import { ContactServices } from "../services/contact.service.js";

export const ContactController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const subject =
        req.body?.subject !== undefined && req.body?.subject !== null && String(req.body.subject).trim() !== ""
          ? String(req.body.subject)
          : undefined;

      const data = await ContactServices.sendMessage({
        name: String(req.body?.name ?? ""),
        email: String(req.body?.email ?? ""),
        ...(subject ? { subject } : {}),
        message: String(req.body?.message ?? ""),
      });

      return res.status(200).json({
        message: "Pesan terkirim",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "Gagal mengirim pesan",
      });
    }
  },
};
