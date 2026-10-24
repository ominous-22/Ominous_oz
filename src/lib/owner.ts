import { createMiddleware, createServerFn } from "@tanstack/react-start";

export type OwnerStatus = {
  signedIn: boolean;
  /** False on a server with no CARTOGRAPHER_PASSWORD (and not in local dev). */
  passwordSet: boolean;
  /** True only in local dev with no password: the desk is open on this machine. */
  devOpen: boolean;
};

/**
 * Server functions that touch the desk or the model run behind this. It throws
 * "Unauthorized" when the caller hasn't signed in with the owner password.
 */
export const ownerMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const o = await import("./owner.server");
    o.assertSameSite();
    if (!o.isOwner()) throw new Error("Unauthorized");
    return next({ context: { userId: o.OWNER_ID } });
  },
);

export const getOwnerStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<OwnerStatus> => {
    const o = await import("./owner.server");
    return {
      signedIn: o.isOwner(),
      passwordSet: o.passwordSet(),
      devOpen: o.devOpen(),
    };
  },
);

export const signIn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const pw =
      input && typeof input === "object" && "password" in input
        ? String((input as { password: unknown }).password ?? "")
        : "";
    if (pw.length > 512) throw new Error("Wrong password.");
    return { password: pw };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const o = await import("./owner.server");
    o.assertSameSite();
    const error = await o.checkPassword(data.password);
    return error ? { ok: false, error } : { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const o = await import("./owner.server");
  o.assertSameSite();
  o.clearSession();
  return { ok: true };
});
