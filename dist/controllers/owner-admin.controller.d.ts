import type { Request, Response } from 'express';
export declare const OwnerAdminController: {
    getDashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    setUserStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCustomerDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    setCustomerBlacklist(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    confirmTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    requestRefund(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getReportsDashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getReportsRevenue(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getReportsBookings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getReportsStudioUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSchedules(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    blockSchedule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    unblockSchedule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateOperationalHours(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=owner-admin.controller.d.ts.map