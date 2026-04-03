import type { Request, Response } from "express";
export declare const AdminBookingController: {
    getBookings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBookingDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBookingLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateBooking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    rescheduleBooking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelBooking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateBookingStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=admin-booking.controller.d.ts.map