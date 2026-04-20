import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
let prismaInstance = globalForPrisma.prisma;
function getPrismaClient() {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient();
        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = prismaInstance;
        }
    }
    return prismaInstance;
}
// Lazy proxy avoids crashing the whole serverless function during module import
// when database env/config is not ready yet.
export const prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
//# sourceMappingURL=prisma.js.map