export declare function sendEmail(params: {
    html?: string;
    subject: string;
    text: string;
    to: string;
}): Promise<void>;
export declare function sendOTPEmail(email: string, otp: string): Promise<void>;
//# sourceMappingURL=mailer.d.ts.map