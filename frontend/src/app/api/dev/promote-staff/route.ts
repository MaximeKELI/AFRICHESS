import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

/** Dev-only: promote KELI (and similar) to staff/superuser. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const root = path.resolve(process.cwd(), "..");
  const script = `
from django.contrib.auth import get_user_model
from django.db.models import Q
U = get_user_model()
updated = []
qs = U.objects.filter(Q(username__icontains="keli") | Q(email__icontains="keli") | Q(username__iexact="admin"))
for u in qs.distinct():
    u.is_staff = True
    u.is_superuser = True
    u.is_active = True
    u.save(update_fields=["is_staff", "is_superuser", "is_active"])
    updated.append(u.username)
if not updated:
    u, created = U.objects.update_or_create(
        username="admin",
        defaults={"email": "admin@africhess.local", "is_staff": True, "is_superuser": True, "is_active": True},
    )
    u.set_password("admin1234")
    u.is_staff = True
    u.is_superuser = True
    u.save()
    updated.append(("admin(created)" if created else "admin(updated)") + "/admin1234")
print("UPDATED:" + ",".join(updated))
print("STAFF:" + str(U.objects.filter(is_staff=True).count()))
`;
  try {
    const { stdout, stderr } = await execFileAsync(
      "docker",
      ["compose", "exec", "-T", "backend", "python", "manage.py", "shell", "-c", script],
      { cwd: root, timeout: 60_000, env: process.env, maxBuffer: 2 * 1024 * 1024 }
    );
    return NextResponse.json({
      ok: true,
      out: `${stdout || ""}${stderr || ""}`.trim(),
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      { ok: false, out: `${e.stdout || ""}${e.stderr || ""}${e.message || ""}`.trim() },
      { status: 500 }
    );
  }
}
