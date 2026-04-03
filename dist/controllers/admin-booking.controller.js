import { AdminBookingServices } from "../services/admin-booking.service.js";
function getSingleValue(value) {
    return Array.isArray(value) ? value[0] : value;
}
function getAuthenticatedUserId(req) {
    if (!req.user?.userId) {
        throw new Error("Unauthorized");
    }
    return req.user.userId;
}
function sendError(res, error, fallbackMessage) {
    console.error(error);
    const message = error?.message ?? fallbackMessage;
    const status = message === "Booking tidak ditemukan" || message === "Jadwal tujuan tidak ditemukan" ? 404 : 400;
    return res.status(status).json({ message });
}
export const AdminBookingController = {
    async getBookings(req, res) {
        try {
            const date = getSingleValue(req.query.date)?.trim();
            const search = getSingleValue(req.query.search)?.trim();
            const status = getSingleValue(req.query.status)?.trim();
            const data = await AdminBookingServices.getBookings({
                ...(date ? { date } : {}),
                ...(search ? { search } : {}),
                ...(status ? { status } : {}),
            });
            return res.status(200).json({
                message: "admin bookings loaded",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to load bookings");
        }
    },
    async getBookingDetail(req, res) {
        try {
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.getBookingDetail(bookingId);
            return res.status(200).json({
                message: "booking detail loaded",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to load booking detail");
        }
    },
    async getBookingLogs(req, res) {
        try {
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.getBookingLogs(bookingId);
            return res.status(200).json({
                message: "booking logs loaded",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to load booking logs");
        }
    },
    async updateBooking(req, res) {
        try {
            const adminId = getAuthenticatedUserId(req);
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.updateBooking(adminId, bookingId, req.body);
            return res.status(200).json({
                message: "booking updated",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to update booking");
        }
    },
    async rescheduleBooking(req, res) {
        try {
            const adminId = getAuthenticatedUserId(req);
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.rescheduleBooking(adminId, bookingId, req.body);
            return res.status(200).json({
                message: "booking rescheduled",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to reschedule booking");
        }
    },
    async cancelBooking(req, res) {
        try {
            const adminId = getAuthenticatedUserId(req);
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.cancelBooking(adminId, bookingId, req.body);
            return res.status(200).json({
                message: "booking cancelled",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to cancel booking");
        }
    },
    async updateBookingStatus(req, res) {
        try {
            const adminId = getAuthenticatedUserId(req);
            const bookingId = getSingleValue(req.params.bookingId)?.trim() ?? "";
            const data = await AdminBookingServices.updateBookingStatus(adminId, bookingId, req.body);
            return res.status(200).json({
                message: "booking status updated",
                data,
            });
        }
        catch (error) {
            return sendError(res, error, "failed to update booking status");
        }
    },
};
//# sourceMappingURL=admin-booking.controller.js.map