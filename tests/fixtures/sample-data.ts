export const sampleLocation = {
  id: "loc-1",
  name: "Medan",
};

export const sampleUser = {
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  email: "user@photoscape.test",
  id: "user-1",
  location: sampleLocation,
  locationId: sampleLocation.id,
  name: "Photoscape User",
  role: "customer",
};

export const sampleBooking = {
  bookingCode: "PS-260425-1234",
  id: "booking-1",
  status: "pending",
};

export const samplePayment = {
  amount: 250000,
  bookingId: sampleBooking.id,
  createdAt: new Date("2026-04-25T08:00:00.000Z"),
  expiredAt: new Date("2026-04-25T08:15:00.000Z"),
  gatewayReference: "PAY-PS-260425-1234",
  id: "payment-1",
  method: "qris",
  paidAt: null,
  status: "pending",
};
