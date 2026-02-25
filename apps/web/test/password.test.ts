import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password utils", () => {
  it("hashes and verifies correctly", () => {
    const password = "Demo@123456";
    const hash = hashPassword(password);
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });
});

