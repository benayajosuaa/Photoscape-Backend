import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
export declare function registerController(req: Request): Promise<Response>;
export declare function loginController(req: Request): Promise<Response>;
export declare function sendOtpController(req: Request): Promise<Response>;
export declare function verifyOtpController(req: Request): Promise<Response>;
export declare function logoutController(req: Request): Promise<Response>;
export declare function registerExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
export declare function loginExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
export declare function sendOtpExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
export declare function verifyOtpExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
export declare function logoutExpressController(req: ExpressRequest, res: ExpressResponse): void;
export declare function meExpressController(req: ExpressRequest, res: ExpressResponse): void;
export declare function assignRoleExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
export declare function findUserExpressController(req: ExpressRequest, res: ExpressResponse): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map