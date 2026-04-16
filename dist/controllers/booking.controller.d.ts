import type { Request, Response } from "express";
export declare const BookingController: {
    getMeta(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAvailability(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createBooking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    showQrisPaymentPage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    confirmQrisPaymentPage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    confirmPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTicket(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    sendTicketInvoiceEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelBooking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=booking.controller.d.ts.map