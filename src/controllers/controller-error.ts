export function logControllerError(error: unknown) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.error(error);
}
