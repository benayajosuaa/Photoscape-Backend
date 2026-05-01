export function logControllerError(error) {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    console.error(error);
}
//# sourceMappingURL=controller-error.js.map