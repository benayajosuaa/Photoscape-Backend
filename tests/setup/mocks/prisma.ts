import { jest } from "@jest/globals";

export function createPrismaMock() {
  return {
    $transaction: jest.fn(),
    addOn: {
      findMany: jest.fn(),
    },
    auditLog: {
      findFirst: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    location: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    photoPackage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    schedule: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    studio: {
      findMany: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  };
}
