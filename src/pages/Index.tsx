import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Clock, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { role, profile, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [sitesRes, workersRes, todayRes] = await Promise.all([
        supabase.from("work_sites").select("id", { count: "exact" }).eq("is_active", true),
        role !== "worker" ? supabase.from("profiles").select("id", { count: "exact" }).eq("is_active", true) : Promise.resolve({ count: 0 }),
        role !== "worker"
          ? supabase.from("attendance_records").select("id", { count: "exact" }).gte("check_in", today)
          : supabase.from("attendance_records").select("*").eq("user_id", profile?.user_id || "").gte("check_in", today),
      ]);
      return {
        sites: sitesRes.count || 0,
        workers: workersRes.count || 0,
        todayRecords: todayRes.count || (todayRes as { data?: unknown[] }).data?.length || 0,
      };
    },
    enabled: !!profile,
  });

  const { data: activeRecord } = useQuery({
    queryKey: ["dashboard-active-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("check_in")
        .eq("user_id", user!.id)
        .eq("status", "checked_in")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const statCards =
    role === "worker"
      ? [
          { label: "Registos Hoje", value: stats?.todayRecords || 0, icon: Clock, color: "text-primary" },
          { label: "Obras Ativas", value: stats?.sites || 0, icon: MapPin, color: "text-secondary" },
        ]
      : [
          { label: "Obras Ativas", value: stats?.sites || 0, icon: MapPin, color: "text-primary" },
          { label: "Equipa Ativa", value: stats?.workers || 0, icon: Users, color: "text-secondary" },
          { label: "Presenças Hoje", value: stats?.todayRecords || 0, icon: Clock, color: "text-success" },
        ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold md:text-3xl">
          {greeting()}, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {role === "worker"
            ? "Use a app para marcar entrada e saída na obra onde está destacado."
            : "Vista operacional da Bertivan com foco em presenças, equipa e obras ativas."}
        </p>
      </div>

      <Card className={activeRecord ? "border-success/50 bg-success/5" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-0.5 h-5 w-5 ${activeRecord ? "text-success" : "text-primary"}`} />
            <div>
              <p className="font-medium">{activeRecord ? "Presença aberta neste momento" : "Sem presença aberta neste momento"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeRecord
                  ? `Entrada registada às ${new Date(activeRecord.check_in).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}.`
                  : "A marcação é validada com PIN e localização para reduzir fraude em obra."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
