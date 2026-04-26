import { jest } from "@jest/globals";

type MockRequestOptions = {
  authToken?: string;
  body?: any;
  headers?: Record<string, string | undefined>;
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  user?: any;
};

export function createMockReq(options: MockRequestOptions = {}) {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    authToken: options.authToken,
    body: options.body ?? {},
    header: jest.fn((name: string) => headers[name.toLowerCase()] ?? undefined),
    headers,
    params: options.params ?? {},
    query: options.query ?? {},
    user: options.user,
  } as any;
}

export function createMockRes() {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

export function createMockNext() {
  return jest.fn();
}
