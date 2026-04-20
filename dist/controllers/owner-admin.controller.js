import { OwnerAdminServices } from '../services/owner-admin.service.js';
function single(value) {
    return Array.isArray(value) ? value[0] : value;
}
function actorFrom(req) {
    if (!req.user?.userId || !req.user?.role) {
        throw new Error('Unauthorized');
    }
    return {
        userId: req.user.userId,
        role: req.user.role,
        locationId: req.user.locationId ?? null,
    };
}
function commonQuery(req) {
    const keys = ['page', 'limit', 'startDate', 'endDate', 'period', 'search', 'status', 'method', 'locationId', 'studioId', 'userId', 'action'];
    return keys.reduce((acc, key) => {
        const value = single(req.query[key])?.trim();
        if (value)
            acc[key] = value;
        return acc;
    }, {});
}
function sendError(res, error, fallback) {
    console.error(error);
    const message = error?.message ?? fallback;
    const status = message.includes('tidak ditemukan') ? 404 :
        message.includes('Unauthorized') ? 401 :
            message.includes('Forbidden') ? 403 : 400;
    return res.status(status).json({ message });
}
export const OwnerAdminController = {
    async getDashboard(req, res) {
        try {
            const data = await OwnerAdminServices.getDashboard(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'dashboard loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load dashboard');
        }
    },
    async getUsers(req, res) {
        try {
            const data = await OwnerAdminServices.getUsers(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'users loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load users');
        }
    },
    async createUser(req, res) {
        try {
            const data = await OwnerAdminServices.createUser(actorFrom(req), req.body || {});
            return res.status(201).json({ message: 'user created', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to create user');
        }
    },
    async updateUser(req, res) {
        try {
            const userId = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.updateUser(actorFrom(req), userId, req.body || {});
            return res.status(200).json({ message: 'user updated', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to update user');
        }
    },
    async resetPassword(req, res) {
        try {
            const userId = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.resetUserPassword(actorFrom(req), userId, req.body || {});
            return res.status(200).json({ message: 'password reset', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to reset password');
        }
    },
    async setUserStatus(req, res) {
        try {
            const userId = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.setUserStatus(actorFrom(req), userId, req.body || {});
            return res.status(200).json({ message: 'user status updated', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to update user status');
        }
    },
    async getCustomers(req, res) {
        try {
            const data = await OwnerAdminServices.getCustomers(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'customers loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load customers');
        }
    },
    async getCustomerDetail(req, res) {
        try {
            const id = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.getCustomerDetail(actorFrom(req), id);
            return res.status(200).json({ message: 'customer detail loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load customer detail');
        }
    },
    async updateCustomer(req, res) {
        try {
            const id = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.updateCustomer(actorFrom(req), id, req.body || {});
            return res.status(200).json({ message: 'customer updated', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to update customer');
        }
    },
    async setCustomerBlacklist(req, res) {
        try {
            const id = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.setCustomerBlacklist(actorFrom(req), id, req.body || {});
            return res.status(200).json({ message: 'customer blacklist updated', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to blacklist customer');
        }
    },
    async getTransactions(req, res) {
        try {
            const data = await OwnerAdminServices.getTransactions(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'transactions loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load transactions');
        }
    },
    async confirmTransaction(req, res) {
        try {
            const id = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.confirmTransaction(actorFrom(req), id);
            return res.status(200).json({ message: 'transaction confirmed', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to confirm transaction');
        }
    },
    async requestRefund(req, res) {
        try {
            const id = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.refundTransaction(actorFrom(req), id, req.body || {});
            return res.status(200).json({ message: 'refund requested', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to request refund');
        }
    },
    async exportTransactions(req, res) {
        try {
            const csv = await OwnerAdminServices.exportTransactions(actorFrom(req), commonQuery(req));
            const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            return res.status(200).send(csv);
        }
        catch (error) {
            return sendError(res, error, 'failed to export transactions');
        }
    },
    async getReportsDashboard(req, res) {
        try {
            const data = await OwnerAdminServices.getReportsDashboard(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'reports dashboard loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load reports dashboard');
        }
    },
    async getReportsRevenue(req, res) {
        try {
            const data = await OwnerAdminServices.getReportsRevenue(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'revenue report loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load revenue report');
        }
    },
    async getReportsBookings(req, res) {
        try {
            const data = await OwnerAdminServices.getReportsBookings(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'bookings report loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load bookings report');
        }
    },
    async getReportsStudioUsage(req, res) {
        try {
            const data = await OwnerAdminServices.getReportsStudioUsage(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'studio usage report loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load studio usage report');
        }
    },
    async getLogs(req, res) {
        try {
            const data = await OwnerAdminServices.getLogs(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'logs loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load logs');
        }
    },
    async getSchedules(req, res) {
        try {
            const data = await OwnerAdminServices.getSchedules(actorFrom(req), commonQuery(req));
            return res.status(200).json({ message: 'schedules loaded', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to load schedules');
        }
    },
    async blockSchedule(req, res) {
        try {
            const data = await OwnerAdminServices.blockSchedule(actorFrom(req), req.body || {});
            return res.status(201).json({ message: 'schedule blocked', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to block schedule');
        }
    },
    async unblockSchedule(req, res) {
        try {
            const blockId = single(req.params.id)?.trim() || '';
            const data = await OwnerAdminServices.unblockSchedule(actorFrom(req), blockId);
            return res.status(200).json({ message: 'schedule block removed', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to remove schedule block');
        }
    },
    async updateOperationalHours(req, res) {
        try {
            const data = await OwnerAdminServices.updateOperationalHours(actorFrom(req), req.body || {});
            return res.status(200).json({ message: 'operational hours updated', data });
        }
        catch (error) {
            return sendError(res, error, 'failed to update operational hours');
        }
    },
};
//# sourceMappingURL=owner-admin.controller.js.map