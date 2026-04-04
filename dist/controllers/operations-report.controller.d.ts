import type { Request, Response } from "express";
export declare const OperationsReportController: {
    getDashboardSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBookingReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStudioUsageReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPaymentReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPerformanceReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAdminActivityReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=operations-report.controller.d.ts.map