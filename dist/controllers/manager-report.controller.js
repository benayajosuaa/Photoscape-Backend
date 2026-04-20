import { ManagerReportServices } from '../services/manager-report.service.js';
function getSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
function getActor(req) {
    if (!req.user?.userId) {
        throw new Error('Unauthorized');
    }
    return {
        userId: req.user.userId,
        role: req.user.role,
        locationId: req.user.locationId ?? null,
    };
}
function getCommonFilters(req) {
    const date = getSingleValue(req.query.date)?.trim();
    const startDate = getSingleValue(req.query.startDate)?.trim();
    const endDate = getSingleValue(req.query.endDate)?.trim();
    const period = getSingleValue(req.query.period)?.trim();
    const locationId = getSingleValue(req.query.locationId)?.trim();
    const status = getSingleValue(req.query.status)?.trim();
    const studioId = getSingleValue(req.query.studioId)?.trim();
    const serviceType = getSingleValue(req.query.serviceType)?.trim();
    const method = getSingleValue(req.query.method)?.trim();
    const action = getSingleValue(req.query.action)?.trim();
    const page = getSingleValue(req.query.page)?.trim();
    const limit = getSingleValue(req.query.limit)?.trim();
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
function sendError(res, error, fallbackMessage) {
    console.error(error);
    return res.status(400).json({
        message: error?.message ?? fallbackMessage,
    });
}
export const ManagerReportController = {
    async getFilterOptions(req, res) {
        try {
            const data = await ManagerReportServices.getFilterOptions(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager filter options loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager filter options');
        }
    },
    async getDailySummary(req, res) {
        try {
            const data = await ManagerReportServices.getDailySummary(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager daily summary loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager daily summary');
        }
    },
    async getBookings(req, res) {
        try {
            const data = await ManagerReportServices.getBookings(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager bookings loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager bookings');
        }
    },
    async getStudioUsage(req, res) {
        try {
            const data = await ManagerReportServices.getStudioUsage(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager studio usage loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager studio usage');
        }
    },
    async getTransactions(req, res) {
        try {
            const data = await ManagerReportServices.getTransactions(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager transactions loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager transactions');
        }
    },
    async getActivityLogs(req, res) {
        try {
            const data = await ManagerReportServices.getActivityLogs(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager activity logs loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager activity logs');
        }
    },
    async getPerformance(req, res) {
        try {
            const data = await ManagerReportServices.getPerformanceStats(getActor(req), getCommonFilters(req));
            return res.status(200).json({
                message: 'manager performance loaded',
                data,
            });
        }
        catch (error) {
            return sendError(res, error, 'failed to load manager performance');
        }
    },
};
//# sourceMappingURL=manager-report.controller.js.map