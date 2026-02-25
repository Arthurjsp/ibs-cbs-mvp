import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRoles } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  role: z.enum(["ADMIN", "FISCAL", "CFO"]),
  password: z.string().min(8).max(128)
});

const toggleUserSchema = z.object({
  userId: z.string().min(1),
  nextActive: z.enum(["true", "false"])
});

function alertForStatus(status?: string) {
  if (status === "created") return { tone: "ok", text: "Usuario criado com sucesso." };
  if (status === "updated") return { tone: "ok", text: "Status do usuario atualizado." };
  if (status === "exists") return { tone: "error", text: "Email ja vinculado a outro usuario." };
  if (status === "self") return { tone: "error", text: "Nao e permitido desativar seu proprio usuario." };
  if (status === "invalid") return { tone: "error", text: "Dados invalidos. Revise o formulario." };
  if (status === "error") return { tone: "error", text: "Nao foi possivel concluir a operacao." };
  return null;
}

interface Props {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function UsersSettingsPage({ searchParams }: Props) {
  const currentUser = await requireRoles(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { tenantId: currentUser.tenantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  const status = typeof searchParams?.status === "string" ? searchParams.status : undefined;
  const alert = alertForStatus(status);

  async function createUser(formData: FormData) {
    "use server";

    const actor = await requireRoles(["ADMIN"]);
    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: String(formData.get("email") ?? "").toLowerCase(),
      role: formData.get("role"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      redirect("/settings/users?status=invalid");
    }

    try {
      const existing = await prisma.user.findFirst({
        where: { email: parsed.data.email },
        select: { id: true }
      });
      if (existing) {
        redirect("/settings/users?status=exists");
      }

      await prisma.user.create({
        data: {
          tenantId: actor.tenantId,
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role as UserRole,
          passwordHash: hashPassword(parsed.data.password),
          isActive: true
        }
      });
    } catch {
      redirect("/settings/users?status=error");
    }

    revalidatePath("/settings/users");
    redirect("/settings/users?status=created");
  }

  async function changeStatus(formData: FormData) {
    "use server";

    const actor = await requireRoles(["ADMIN"]);
    const parsed = toggleUserSchema.safeParse({
      userId: formData.get("userId"),
      nextActive: formData.get("nextActive")
    });

    if (!parsed.success) {
      redirect("/settings/users?status=invalid");
    }

    if (parsed.data.userId === actor.id && parsed.data.nextActive === "false") {
      redirect("/settings/users?status=self");
    }

    try {
      const target = await prisma.user.findFirst({
        where: { id: parsed.data.userId, tenantId: actor.tenantId },
        select: { id: true }
      });
      if (!target) {
        redirect("/settings/users?status=error");
      }

      await prisma.user.update({
        where: { id: parsed.data.userId },
        data: { isActive: parsed.data.nextActive === "true" }
      });
    } catch {
      redirect("/settings/users?status=error");
    }

    revalidatePath("/settings/users");
    redirect("/settings/users?status=updated");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios da conta corporativa</h1>
        <p className="text-sm text-muted-foreground">Cada pessoa da empresa deve ter seu proprio login.</p>
      </div>

      {alert ? (
        <div
          className={`rounded-md border p-3 text-sm ${
            alert.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
          role="status"
        >
          {alert.text}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Novo usuario</CardTitle>
          <CardDescription>Crie usuarios individuais para administracao, fiscal e financeiro.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <select
                id="role"
                name="role"
                defaultValue="FISCAL"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="ADMIN">ADMIN</option>
                <option value="FISCAL">FISCAL</option>
                <option value="CFO">CFO</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha inicial</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Criar usuario</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios ativos e inativos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ultimo login</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name ?? "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : "-"}</TableCell>
                  <TableCell>
                    <form action={changeStatus}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="nextActive" value={String(!user.isActive)} />
                      <Button type="submit" size="sm" variant="outline">
                        {user.isActive ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

