import { UserRole } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ensureBaselineScenario, ensureDefaultLegacyRuleSet, ensureDefaultRuleSet } from "@/lib/ruleset";

export const registerCompanySchema = z
  .object({
    tenantName: z.string().trim().min(2).max(120),
    legalName: z.string().trim().min(2).max(160),
    cnpj: z.string().trim().max(32).optional().or(z.literal("")),
    uf: z.string().trim().toUpperCase().length(2),
    segment: z.string().trim().max(120).optional().or(z.literal("")),
    adminName: z.string().trim().min(2).max(120),
    adminEmail: z.string().trim().email().max(160),
    adminPassword: z.string().min(8).max(128),
    adminPasswordConfirm: z.string().min(8).max(128)
  })
  .refine((data) => data.adminPassword === data.adminPasswordConfirm, {
    path: ["adminPasswordConfirm"],
    message: "A confirmacao de senha nao confere."
  });

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

export async function provisionCompanyAccount(input: RegisterCompanyInput) {
  const parsed = registerCompanySchema.parse(input);
  const normalizedEmail = parsed.adminEmail.toLowerCase();

  const existingEmail = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true }
  });
  if (existingEmail) {
    throw new Error("Este email ja esta vinculado a outra conta.");
  }

  const passwordHash = hashPassword(parsed.adminPassword);

  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        name: parsed.tenantName
      }
    });

    await tx.companyProfile.create({
      data: {
        tenantId: createdTenant.id,
        legalName: parsed.legalName,
        cnpj: parsed.cnpj || null,
        uf: parsed.uf,
        segment: parsed.segment || null
      }
    });

    await tx.user.create({
      data: {
        tenantId: createdTenant.id,
        email: normalizedEmail,
        name: parsed.adminName,
        role: UserRole.ADMIN,
        passwordHash,
        isActive: true
      }
    });

    return createdTenant;
  });

  await ensureDefaultRuleSet(tenant.id);
  await ensureDefaultLegacyRuleSet(tenant.id);
  await ensureBaselineScenario(tenant.id);

  return tenant;
}

