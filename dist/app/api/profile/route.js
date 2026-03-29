import { authenticate } from '../../../middleware/auth.middleware.js';
export async function GET(req) {
    try {
        const user = authenticate(req);
        return Response.json({ user });
    }
    catch {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
}
//# sourceMappingURL=route.js.map