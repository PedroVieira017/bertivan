import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, CalendarClock, CalendarDays, Clock, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type ScheduleForm = {
  id?: string;
  user_id: string;
  work_site_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const emptyForm: ScheduleForm = {
  user_id: "",
  work_site_id: "",
  day_of_week: "1",
  start_time: "08:00",
  end_time: "17:00",
};

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-PT");
};

const toDateValue = (value: string) => new Date(`${value}T00:00:00`);

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Reports = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterWorker, setFilterWorker] = useState("all");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyForm);

  const { data: workers } = useQuery({
    queryKey: ["report-workers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sites } = useQuery({
    queryKey: ["report-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_sites").select("id, name, latitude, longitude, radius_meters").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ["report-records", dateFrom, dateTo, filterWorker],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select("*")
        .gte("check_in", dateFrom)
        .lte("check_in", `${dateTo}T23:59:59`);
      if (filterWorker !== "all") query = query.eq("user_id", filterWorker);
      const { data, error } = await query.order("check_in", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["report-schedules", filterWorker],
    queryFn: async () => {
      let query = supabase.from("work_schedules").select("*").order("day_of_week").order("start_time");
      if (filterWorker !== "all") query = query.eq("user_id", filterWorker);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const workerNameById = useMemo(
    () => new Map((workers || []).map((worker) => [worker.user_id, worker.full_name])),
    [workers]
  );

  const siteNameById = useMemo(
    () => new Map((sites || []).map((site) => [site.id, site.name])),
    [sites]
  );

  const siteById = useMemo(
    () => new Map((sites || []).map((site) => [site.id, site])),
    [sites]
  );

  const calcHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "Em curso";
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const formatLocation = (latitude: number | null, longitude: number | null) => {
    if (latitude == null || longitude == null) return "Sem registo";
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  };

  const mapLink = (latitude: number | null, longitude: number | null) => {
    if (latitude == null || longitude == null) return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  const distanceInMeters = (latitude: number, longitude: number, siteLatitude: number, siteLongitude: number) => {
    const earthRadius = 6371000;
    const dLat = ((siteLatitude - latitude) * Math.PI) / 180;
    const dLon = ((siteLongitude - longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((siteLatitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const locationStatus = (latitude: number | null, longitude: number | null, workSiteId: string) => {
    const site = siteById.get(workSiteId);
    if (!site || latitude == null || longitude == null) return null;
    const distance = Math.round(distanceInMeters(latitude, longitude, site.latitude, site.longitude));
    const withinRadius = distance <= site.radius_meters;
    return {
      distance,
      withinRadius,
      siteLabel: `${site.name} (${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)})`,
      radius: site.radius_meters,
    };
  };

  const locationBadge = (withinRadius: boolean) => (
    <Badge variant={withinRadius ? "default" : "destructive"}>
      {withinRadius ? "Dentro do raio" : "Fora do raio"}
    </Badge>
  );

  const totalHours = records?.reduce((acc, record) => {
    if (!record.check_out) return acc;
    return acc + (new Date(record.check_out).getTime() - new Date(record.check_in).getTime());
  }, 0) || 0;

  const siteHoursSummary = useMemo(() => {
    const grouped = new Map<string, { siteName: string; totalMs: number; workerMs: Map<string, number> }>();

    for (const record of records || []) {
      if (!record.check_out) continue;
      const durationMs = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
      const siteId = record.work_site_id;
      const workerId = record.user_id;
      const siteName = siteNameById.get(siteId) || "Sem obra";

      if (!grouped.has(siteId)) {
        grouped.set(siteId, { siteName, totalMs: 0, workerMs: new Map<string, number>() });
      }

      const siteEntry = grouped.get(siteId)!;
      siteEntry.totalMs += durationMs;
      siteEntry.workerMs.set(workerId, (siteEntry.workerMs.get(workerId) || 0) + durationMs);
    }

    return Array.from(grouped.entries())
      .map(([siteId, value]) => ({
        siteId,
        siteName: value.siteName,
        totalMs: value.totalMs,
        workers: Array.from(value.workerMs.entries())
          .map(([workerId, totalMs]) => ({
            workerId,
            workerName: workerNameById.get(workerId) || "Sem nome",
            totalMs,
          }))
          .sort((a, b) => b.totalMs - a.totalMs),
      }))
      .sort((a, b) => b.totalMs - a.totalMs);
  }, [records, siteNameById, workerNameById]);

  const formatHoursFromMs = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const exportCSV = () => {
    if (!records?.length) return;
    const header = "Nome,Obra,Entrada,Local Entrada,Saida,Local Saida,Horas\n";
    const rows = records.map((record) =>
      `"${workerNameById.get(record.user_id) || "Sem nome"}","${siteNameById.get(record.work_site_id) || "Sem obra"}","${new Date(record.check_in).toLocaleString("pt-PT")}","${formatLocation(record.check_in_latitude, record.check_in_longitude)}","${record.check_out ? new Date(record.check_out).toLocaleString("pt-PT") : "Em curso"}","${formatLocation(record.check_out_latitude, record.check_out_longitude)}","${calcHours(record.check_in, record.check_out)}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bertivan_relatorio_${dateFrom}_${dateTo}.csv`;
    a.click();
  };

  const exportWorkSummaryPdf = () => {
    const popup = window.open("", "_blank", "width=1024,height=768");
    if (!popup) {
      toast({
        title: "Erro",
        description: "Nao foi possivel abrir a janela de impressao. Verifique se o bloqueador de popups esta ativo.",
        variant: "destructive",
      });
      return;
    }

    const generatedAt = new Date().toLocaleString("pt-PT");
    const summaryBlocks = siteHoursSummary.length
      ? siteHoursSummary.map((site) => `
          <section class="site-card">
            <div class="site-header">
              <div>
                <h2>${site.siteName}</h2>
                <p>Total acumulado da equipa nesta obra</p>
              </div>
              <div class="site-total">${formatHoursFromMs(site.totalMs)}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Trabalhador</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                ${site.workers.map((worker) => `
                  <tr>
                    <td>${worker.workerName}</td>
                    <td>${formatHoursFromMs(worker.totalMs)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </section>
        `).join("")
      : `<p class="empty">Sem horas fechadas no periodo selecionado.</p>`;

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="pt-PT">
        <head>
          <meta charset="UTF-8" />
          <title>Resumo de Obra Bertivan</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #1f2937;
              margin: 32px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 3px solid #f97316;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 6px 0 0;
              color: #4b5563;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 24px;
            }
            .meta-card {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px 14px;
              background: #f9fafb;
            }
            .meta-card span {
              display: block;
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .meta-card strong {
              display: block;
              margin-top: 4px;
              font-size: 18px;
            }
            .site-card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 18px;
              margin-bottom: 18px;
              break-inside: avoid;
            }
            .site-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-bottom: 14px;
            }
            .site-header h2 {
              margin: 0;
              font-size: 20px;
            }
            .site-header p {
              margin: 4px 0 0;
              color: #6b7280;
            }
            .site-total {
              font-size: 24px;
              font-weight: 700;
              color: #111827;
              white-space: nowrap;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
              text-align: left;
            }
            th {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #6b7280;
            }
            td:last-child, th:last-child {
              text-align: right;
            }
            .empty {
              color: #6b7280;
              font-size: 14px;
              border: 1px dashed #d1d5db;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
            }
            @media print {
              body {
                margin: 18px;
              }
            }
          </style>
        </head>
        <body>
          <header class="header">
            <h1>Bertivan - Resumo de Obra</h1>
            <p>Relatorio estruturado de horas por obra e por trabalhador.</p>
          </header>
          <section class="meta">
            <div class="meta-card">
              <span>Periodo</span>
              <strong>${dateFrom} ate ${dateTo}</strong>
            </div>
            <div class="meta-card">
              <span>Total Geral</span>
              <strong>${formatHoursFromMs(totalHours)}</strong>
            </div>
            <div class="meta-card">
              <span>Gerado em</span>
              <strong>${generatedAt}</strong>
            </div>
          </section>
          ${summaryBlocks}
        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();
    popup.print();
  };

  const openCreateSchedule = () => {
    setScheduleForm(emptyForm);
    setScheduleOpen(true);
  };

  const openEditSchedule = (schedule: any) => {
    setScheduleForm({
      id: schedule.id,
      user_id: schedule.user_id,
      work_site_id: schedule.work_site_id || "",
      day_of_week: String(schedule.day_of_week),
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
    });
    setScheduleOpen(true);
  };

  const saveSchedule = useMutation({
    mutationFn: async () => {
      if (!scheduleForm.user_id || !scheduleForm.work_site_id) {
        throw new Error("Selecione o trabalhador e a obra.");
      }

      const payload = {
        user_id: scheduleForm.user_id,
        work_site_id: scheduleForm.work_site_id,
        day_of_week: Number(scheduleForm.day_of_week),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
      };

      if (scheduleForm.id) {
        const { error } = await supabase.from("work_schedules").update(payload).eq("id", scheduleForm.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("work_schedules").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Horário guardado" });
      setScheduleOpen(false);
      setScheduleForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase.from("work_schedules").delete().eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Horário removido" });
      queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-display font-bold">Horários e Presenças</h1>
        <p className="text-muted-foreground">Consulta reservada ao administrador e ao patrão para acompanhamento da equipa.</p>
      </div>

      <Card className="mx-auto min-w-0 w-full max-w-4xl">
        <CardContent className="pt-6">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:justify-self-center sm:w-full">
              <Label>De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-center text-center font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDateLabel(dateFrom)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={toDateValue(dateFrom)}
                    onSelect={(value) => value && setDateFrom(toIsoDate(value))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 sm:justify-self-center sm:w-full">
              <Label>Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-center text-center font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDateLabel(dateTo)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={toDateValue(dateTo)}
                    onSelect={(value) => value && setDateTo(toIsoDate(value))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-md">
              <Label>Trabalhador</Label>
              <Select value={filterWorker} onValueChange={setFilterWorker}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.user_id} value={worker.user_id}>
                      {worker.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Registos</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{records?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Horas Totais</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.floor(totalHours / 3600000)}h {Math.floor((totalHours % 3600000) / 60000)}m
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={exportCSV} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
        <Button variant="outline" onClick={exportWorkSummaryPdf} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Resumo Obra PDF
        </Button>
      </div>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Horas por obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {siteHoursSummary.map((site) => (
            <div key={site.siteId} className="rounded-lg border border-border/70 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{site.siteName}</p>
                  <p className="text-sm text-muted-foreground">
                    Total acumulado da equipa nesta obra
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatHoursFromMs(site.totalMs)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {site.workers.map((worker) => (
                  <div key={worker.workerId} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span>{worker.workerName}</span>
                    <span className="font-medium">{formatHoursFromMs(worker.totalMs)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!siteHoursSummary.length && (
              <p className="py-6 text-center text-muted-foreground">
              Sem horas fechadas no período selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registo de presenças</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Local Entrada</TableHead>
                <TableHead>Saida</TableHead>
                <TableHead>Local Saida</TableHead>
                <TableHead>Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{workerNameById.get(record.user_id) || "Sem nome"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{siteNameById.get(record.work_site_id) || "Sem obra"}</p>
                      {siteById.get(record.work_site_id) && (
                        <p className="text-xs text-muted-foreground">
                          {siteById.get(record.work_site_id)!.latitude.toFixed(5)}, {siteById.get(record.work_site_id)!.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(record.check_in).toLocaleString("pt-PT")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="space-y-2">
                      <p>{formatLocation(record.check_in_latitude, record.check_in_longitude)}</p>
                      {locationStatus(record.check_in_latitude, record.check_in_longitude, record.work_site_id) && (
                        <div className="space-y-1">
                          {locationBadge(locationStatus(record.check_in_latitude, record.check_in_longitude, record.work_site_id)!.withinRadius)}
                          <p>
                            Distância à obra: {locationStatus(record.check_in_latitude, record.check_in_longitude, record.work_site_id)!.distance} m
                          </p>
                          <p>
                            Raio definido: {locationStatus(record.check_in_latitude, record.check_in_longitude, record.work_site_id)!.radius} m
                          </p>
                        </div>
                      )}
                      {mapLink(record.check_in_latitude, record.check_in_longitude) && (
                        <a
                          href={mapLink(record.check_in_latitude, record.check_in_longitude) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          Abrir mapa
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{record.check_out ? new Date(record.check_out).toLocaleString("pt-PT") : <span className="text-success">Em curso</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="space-y-2">
                      <p>{formatLocation(record.check_out_latitude, record.check_out_longitude)}</p>
                      {locationStatus(record.check_out_latitude, record.check_out_longitude, record.work_site_id) && (
                        <div className="space-y-1">
                          {locationBadge(locationStatus(record.check_out_latitude, record.check_out_longitude, record.work_site_id)!.withinRadius)}
                          <p>
                            Distância à obra: {locationStatus(record.check_out_latitude, record.check_out_longitude, record.work_site_id)!.distance} m
                          </p>
                          <p>
                            Raio definido: {locationStatus(record.check_out_latitude, record.check_out_longitude, record.work_site_id)!.radius} m
                          </p>
                        </div>
                      )}
                      {mapLink(record.check_out_latitude, record.check_out_longitude) && (
                        <a
                          href={mapLink(record.check_out_latitude, record.check_out_longitude) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          Abrir mapa
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{calcHours(record.check_in, record.check_out)}</TableCell>
                </TableRow>
              ))}
              {!records?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sem registos para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Horários planeados</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {role === "admin" && (
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openCreateSchedule} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Novo horário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{scheduleForm.id ? "Editar horário" : "Novo horário"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Trabalhador</Label>
                      <Select value={scheduleForm.user_id} onValueChange={(value) => setScheduleForm({ ...scheduleForm, user_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o trabalhador" />
                        </SelectTrigger>
                        <SelectContent>
                          {workers?.map((worker) => (
                            <SelectItem key={worker.user_id} value={worker.user_id}>
                              {worker.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Obra</Label>
                      <Select value={scheduleForm.work_site_id} onValueChange={(value) => setScheduleForm({ ...scheduleForm, work_site_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a obra" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites?.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dia</Label>
                      <Select value={scheduleForm.day_of_week} onValueChange={(value) => setScheduleForm({ ...scheduleForm, day_of_week: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDays.map((day, index) => (
                            <SelectItem key={day} value={String(index)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Inicio</Label>
                        <Input type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fim</Label>
                        <Input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} />
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>
                      {saveSchedule.isPending ? "A guardar..." : "Guardar horário"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Trabalhador</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Obra</TableHead>
                {role === "admin" && <TableHead className="w-[140px]">Acoes</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules?.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{workerNameById.get(schedule.user_id) || "Sem nome"}</TableCell>
                  <TableCell>{weekDays[schedule.day_of_week] || "Dia"}</TableCell>
                  <TableCell>{schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}</TableCell>
                  <TableCell>{siteNameById.get(schedule.work_site_id || "") || "Sem obra fixa"}</TableCell>
                  {role === "admin" && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditSchedule(schedule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteSchedule.mutate(schedule.id)} disabled={deleteSchedule.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!schedules?.length && (
                <TableRow>
                  <TableCell colSpan={role === "admin" ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Sem horários definidos para o filtro atual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
