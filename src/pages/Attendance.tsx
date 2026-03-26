import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, LocateFixed, LogIn, LogOut, RefreshCw, Shield } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type GeoPermission = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

const Attendance = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const watchIdRef = useRef<number | null>(null);

  const [pin, setPin] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [permissionState, setPermissionState] = useState<GeoPermission>("unknown");
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  const startLocationWatch = () => {
    if (!navigator.geolocation) {
      setPermissionState("unsupported");
      setLocationError("Este equipamento não suporta localização.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError("");
        setPermissionState("granted");
        setShowLocationHelp(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("denied");
          setShowLocationHelp(true);
          setLocationError("A localização está bloqueada. Permita o acesso para marcar presença.");
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("A localização não está disponível neste momento. Ative o GPS e tente novamente.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationError("A obtenção da localização demorou demasiado tempo. Tente novamente.");
          return;
        }

        setLocationError("Não foi possível obter a localização. Ative o GPS e permita acesso.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  const requestLocationAgain = () => {
    setLocationError("");
    startLocationWatch();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError("");
          setPermissionState("granted");
          setShowLocationHelp(false);
          toast({ title: "Localização ativa", description: "A posição atual foi atualizada com sucesso." });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState("denied");
            setShowLocationHelp(true);
            setLocationError("A localização continua bloqueada. Abra as definições do navegador e permita o acesso.");
            toast({
              title: "Localização bloqueada",
              description: "Permita a localização no navegador para continuar.",
              variant: "destructive",
            });
            return;
          }

          setLocationError("Não foi possível atualizar a localização. Confirme que o GPS está ativo.");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (!navigator.geolocation) {
        setPermissionState("unsupported");
        setLocationError("Este equipamento não suporta localização.");
        return;
      }

      try {
        if ("permissions" in navigator && navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (!mounted) return;

          setPermissionState(status.state as GeoPermission);
          if (status.state === "denied") {
            setShowLocationHelp(true);
            setLocationError("A localização está desligada ou bloqueada. Ative-a para marcar presença.");
          }

          status.onchange = () => {
            setPermissionState(status.state as GeoPermission);
            if (status.state === "granted") {
              startLocationWatch();
            }
          };
        }
      } catch {
        setPermissionState("unknown");
      }

      startLocationWatch();
    };

    void checkPermission();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const { data: sites } = useQuery({
    queryKey: ["work-sites"],
    queryFn: async () => {
      const { data } = await supabase.from("work_sites").select("*").eq("is_active", true);
      return data as Tables<"work_sites">[];
    },
  });

  const { data: activeRecord } = useQuery({
    queryKey: ["active-attendance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*, work_sites(name)")
        .eq("user_id", user!.id)
        .eq("status", "checked_in")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isWithinRadius = (site: Tables<"work_sites">) => {
    if (!location) return false;
    const earthRadius = 6371000;
    const dLat = ((site.latitude - location.lat) * Math.PI) / 180;
    const dLon = ((site.longitude - location.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((location.lat * Math.PI) / 180) *
        Math.cos((site.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distance = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= site.radius_meters;
  };

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!user || !location || !selectedSite) throw new Error("Dados em falta.");
      if (pin !== profile?.pin) throw new Error("PIN incorreto.");
      const site = sites?.find((item) => item.id === selectedSite);
      if (!site || !isWithinRadius(site)) throw new Error("Fora do raio permitido para esta obra.");

      const { error } = await supabase.from("attendance_records").insert({
        user_id: user.id,
        work_site_id: selectedSite,
        check_in_latitude: location.lat,
        check_in_longitude: location.lng,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Entrada registada", description: "A sua presença ficou validada com localização." });
      setPin("");
      queryClient.invalidateQueries({ queryKey: ["active-attendance"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!activeRecord || !location) throw new Error("Dados em falta.");
      if (pin !== profile?.pin) throw new Error("PIN incorreto.");

      const { error } = await supabase
        .from("attendance_records")
        .update({
          check_out: new Date().toISOString(),
          check_out_latitude: location.lat,
          check_out_longitude: location.lng,
          status: "checked_out",
        })
        .eq("id", activeRecord.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saída registada", description: "O registo do turno foi fechado com sucesso." });
      setPin("");
      queryClient.invalidateQueries({ queryKey: ["active-attendance"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Marcar Ponto</h1>
        <p className="text-muted-foreground">
          Registe a sua entrada ou saída.{" "}
          {role === "worker"
            ? "Escolha a obra correta antes de iniciar o turno."
            : "A marcação também é obrigatória para perfis de gestão."}
        </p>
      </div>

      <Card className={activeRecord ? "border-success/50 bg-success/5" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${activeRecord ? "bg-success animate-pulse" : "bg-muted-foreground/30"}`} />
            <p className="font-medium">
              {activeRecord ? `Presença ativa em ${(activeRecord as { work_sites?: { name?: string } }).work_sites?.name || "obra"}` : "Sem presença ativa"}
            </p>
          </div>
          {activeRecord && (
            <p className="mt-2 text-sm text-muted-foreground">
              <Clock className="mr-1 inline h-4 w-4" />
              Entrada: {new Date(activeRecord.check_in).toLocaleTimeString("pt-PT")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start gap-3">
            <LocateFixed className={`mt-0.5 h-4 w-4 ${location ? "text-success" : "text-destructive"}`} />
            <div className="space-y-1">
              <p className="text-sm font-medium">Validação por localização</p>
              <p className="text-sm text-muted-foreground">
                {locationError || (location ? `GPS captado: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "A obter localização atual...")}
              </p>
              <p className="text-xs text-muted-foreground">
                A entrada e a saída só devem ser feitas dentro do raio definido para a obra.
              </p>
            </div>
          </div>

          {!location && (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={requestLocationAgain}>
                <RefreshCw className="mr-2 h-4 w-4" /> Ativar localização
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowLocationHelp((value) => !value)}>
                {showLocationHelp ? "Ocultar ajuda" : "Como ativar"}
              </Button>
            </div>
          )}

          {showLocationHelp && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como ativar a localização</p>
              <p className="mt-2">
                No telemóvel, ative o GPS e permita a localização para este site no navegador. Depois carregue em <strong>Ativar localização</strong>.
              </p>
              <p className="mt-2">
                Em Chrome/Edge: toque no cadeado ou no ícone das definições do site e permita <strong>Localização</strong>.
              </p>
              <p className="mt-2">
                Em iPhone/Safari: vá a <strong>Definições &gt; Safari &gt; Localização</strong> ou <strong>Definições &gt; Privacidade e Segurança &gt; Serviços de Localização</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{activeRecord ? "Registar Saída" : "Registar Entrada"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeRecord && (
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      <span className="flex items-center gap-2">
                        {site.name}
                        {location && isWithinRadius(site) && <span className="text-xs text-success">Perto</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Código PIN</Label>
            <div className="flex gap-2">
              <Shield className="mt-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                autoComplete="one-time-code"
                pattern="[0-9]*"
                placeholder="0000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="max-w-36 text-center text-2xl tracking-[0.35em]"
              />
            </div>
          </div>
          <Button
            className="h-14 w-full text-lg"
            onClick={() => (activeRecord ? checkOut.mutate() : checkIn.mutate())}
            disabled={!location || pin.length !== 4 || (!activeRecord && !selectedSite)}
          >
            {activeRecord ? (
              <>
                <LogOut className="mr-2 h-5 w-5" /> Registar Saída
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" /> Registar Entrada
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            O sistema cruza PIN, obra selecionada e coordenadas GPS para reduzir marcações indevidas.
          </p>
          {!location && permissionState === "denied" && (
            <p className="text-xs text-destructive">
              A localização está bloqueada neste navegador. Ative-a nas definições e volte a tocar em <strong>Ativar localização</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
