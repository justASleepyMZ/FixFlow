import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Pencil, ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "@/contexts/LanguageContext";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RequestRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budget: number | null;
  city: string | null;
  user_id: string;
  created_at: string;
}

interface UserRow {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  role: AppRole | null;
  email?: string;
}

const AdminPage = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, tCategory, tStatus } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [editReq, setEditReq] = useState<RequestRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" } as any);
      return;
    }
    if (userRole !== "admin") {
      toast.error(t("adm.accessOnly"));
      navigate({ to: "/" } as any);
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    const [reqRes, profRes, roleRes] = await Promise.all([
      supabase.from("service_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, phone"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (reqRes.data) setRequests(reqRes.data as RequestRow[]);
    if (profRes.data) {
      const roleMap = new Map<string, AppRole>();
      (roleRes.data ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      setUsers(profRes.data.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        phone: p.phone,
        role: roleMap.get(p.user_id) ?? null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userRole === "admin") fetchAll();
  }, [userRole]);

  const deleteRequest = async (id: string) => {
    if (!confirm(t("adm.confirmDelete"))) return;
    const { error } = await supabase.from("service_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("adm.requestDeleted"));
    setRequests((r) => r.filter((x) => x.id !== id));
  };

  const saveRequest = async () => {
    if (!editReq) return;
    const { error } = await supabase
      .from("service_requests")
      .update({
        title: editReq.title,
        description: editReq.description,
        category: editReq.category,
        status: editReq.status,
        budget: editReq.budget,
        city: editReq.city,
      })
      .eq("id", editReq.id);
    if (error) return toast.error(error.message);
    toast.success(t("adm.requestUpdated"));
    setEditReq(null);
    fetchAll();
  };

  const saveUser = async () => {
    if (!editUser) return;
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ display_name: editUser.display_name, phone: editUser.phone })
      .eq("user_id", editUser.user_id);
    if (profErr) return toast.error(profErr.message);

    if (editUser.role) {
      // Delete existing roles, then insert new one
      await supabase.from("user_roles").delete().eq("user_id", editUser.user_id);
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: editUser.user_id, role: editUser.role });
      if (roleErr) return toast.error(roleErr.message);
    }

    toast.success(t("adm.userUpdated"));
    setEditUser(null);
    fetchAll();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Navbar />
        <div className="container flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />
      <div className="container py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{t("adm.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("adm.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">{t("adm.requests")} ({requests.length})</TabsTrigger>
            <TabsTrigger value="users">{t("adm.users")} ({users.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6">
            <div className="grid gap-3">
              {requests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{r.title}</h3>
                        <Badge variant="outline">{tStatus(r.status)}</Badge>
                        <Badge variant="secondary">{tCategory(r.category)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {r.city ?? t("adm.noCity")} · {t("adm.budget")}: {r.budget ?? "—"} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditReq(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteRequest(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {requests.length === 0 && <p className="text-center text-muted-foreground py-12">{t("adm.noRequests")}</p>}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="grid gap-3">
              {users.map((u) => (
                <Card key={u.user_id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{u.display_name ?? t("adm.noName")}</h3>
                        {u.role && <Badge>{u.role}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{u.phone ?? t("adm.noPhone")}</p>
                      <p className="mt-1 text-xs text-muted-foreground font-mono">{u.user_id}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
              {users.length === 0 && <p className="text-center text-muted-foreground py-12">{t("adm.noUsers")}</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={!!editReq} onOpenChange={(o) => !o && setEditReq(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("adm.editRequest")}</DialogTitle></DialogHeader>
          {editReq && (
            <div className="space-y-3">
              <div>
                <Label>{t("adm.fTitle")}</Label>
                <Input value={editReq.title} onChange={(e) => setEditReq({ ...editReq, title: e.target.value })} />
              </div>
              <div>
                <Label>{t("adm.fDescription")}</Label>
                <Textarea value={editReq.description} onChange={(e) => setEditReq({ ...editReq, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("adm.fCategory")}</Label>
                  <Input value={editReq.category} onChange={(e) => setEditReq({ ...editReq, category: e.target.value })} />
                </div>
                <div>
                  <Label>{t("adm.fStatus")}</Label>
                  <Select value={editReq.status} onValueChange={(v) => setEditReq({ ...editReq, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">open</SelectItem>
                      <SelectItem value="assigned">assigned</SelectItem>
                      <SelectItem value="completed">completed</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("adm.fBudget")}</Label>
                  <Input type="number" value={editReq.budget ?? ""} onChange={(e) => setEditReq({ ...editReq, budget: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>{t("adm.fCity")}</Label>
                  <Input value={editReq.city ?? ""} onChange={(e) => setEditReq({ ...editReq, city: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReq(null)}>{t("adm.cancel")}</Button>
            <Button onClick={saveRequest}>{t("adm.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("adm.editUser")}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div>
                <Label>{t("adm.fDisplayName")}</Label>
                <Input value={editUser.display_name ?? ""} onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })} />
              </div>
              <div>
                <Label>{t("adm.fPhone")}</Label>
                <Input value={editUser.phone ?? ""} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
              </div>
              <div>
                <Label>{t("adm.fRole")}</Label>
                <Select value={editUser.role ?? undefined} onValueChange={(v) => setEditUser({ ...editUser, role: v as AppRole })}>
                  <SelectTrigger><SelectValue placeholder={t("adm.selectRole")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="worker">worker</SelectItem>
                    <SelectItem value="company">company</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("adm.cancel")}</Button>
            <Button onClick={saveUser}>{t("adm.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/admin")({ component: AdminPage });
