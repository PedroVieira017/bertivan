import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin } from "lucide-react";

const Sites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", radius_meters: "100" });

  const { data: sites } = useQuery({
    queryKey: ["work-sites-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("work_sites").select("*").order("name");
      return data || [];
    },
  });

  const createSite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_sites").insert({
        name: form.name,
        address: form.address,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Obra criada com sucesso" });
      setOpen(false);
      setForm({ name: "", address: "", latitude: "", longitude: "", radius_meters: "100" });
      queryClient.invalidateQueries({ queryKey: ["work-sites-admin"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleSite = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("work_sites").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-sites-admin"] }),
  });

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }),
      () => toast({ title: "Erro GPS", description: "Ative a localização", variant: "destructive" })
    );
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold">Obras</h1>
          <p className="text-muted-foreground">Gerir locais de obra, coordenadas GPS e raio de validação.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nova Obra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Obra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da obra</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Edifício Solar" />
              </div>
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, Cidade" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="41.6946" />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-8.8310" />
                </div>
              </div>
              <Button variant="outline" type="button" className="w-full" onClick={getLocation}>
                <MapPin className="mr-2 h-4 w-4" /> Usar localização atual
              </Button>
              <div className="space-y-2">
                <Label>Raio de geofencing (metros)</Label>
                <Input type="number" value={form.radius_meters} onChange={(e) => setForm({ ...form, radius_meters: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => createSite.mutate()} disabled={createSite.isPending}>
                {createSite.isPending ? "A criar..." : "Criar Obra"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="min-w-0">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Morada</TableHead>
                  <TableHead>Raio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites?.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>{site.address}</TableCell>
                    <TableCell>{site.radius_meters}m</TableCell>
                    <TableCell>
                      <Badge variant={site.is_active ? "default" : "outline"}>{site.is_active ? "Ativa" : "Inativa"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={site.is_active} onCheckedChange={(value) => toggleSite.mutate({ id: site.id, is_active: value })} />
                    </TableCell>
                  </TableRow>
                ))}
                {!sites?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      <MapPin className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Nenhuma obra registada.
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

export default Sites;
