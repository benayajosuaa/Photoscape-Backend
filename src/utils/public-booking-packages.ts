export type PublicBookingPackageSeed = {
  name: string;
  price: number;
  durationMinutes: number;
  maxCapacity: number;
};

export const PUBLIC_BOOKING_PACKAGES: PublicBookingPackageSeed[] = [
  { name: "Family Lite", price: 220000, durationMinutes: 50, maxCapacity: 5 },
  { name: "Family Deluxe", price: 400000, durationMinutes: 50, maxCapacity: 8 },
  { name: "Family Premium", price: 630000, durationMinutes: 50, maxCapacity: 10 },
  { name: "Group Lite", price: 120000, durationMinutes: 50, maxCapacity: 6 },
  { name: "Group Deluxe", price: 200000, durationMinutes: 50, maxCapacity: 10 },
  { name: "Photo Box Moments", price: 40000, durationMinutes: 25, maxCapacity: 4 },
];

