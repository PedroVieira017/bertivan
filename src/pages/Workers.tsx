import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Smartphone, UserPlus, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Workers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "123456",
    full_name: "",
    role: "worker" as AppRole,
    pin: "0000",
  });

  const { data: workers, isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (
        profiles?.map((profile) => ({
          ...profile,
          role: roles?.find((role) => role.user_id === profile.user_id)?.role || "worker",
        })) || []
      );
    },
  });

  const createWorker = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-worker", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          pin: form.pin,
          role: form.role,
        },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const payload = await error.context.json().catch(() => null);
          if (payload?.error) throw new Error(payload.error);

          const rawText = await error.context.text().catch(() => "");
          throw new Error(rawText || "A edge function devolveu um erro.");
        }

        if (error instanceof FunctionsRelayError) {
          throw new Error("Não foi possível encaminhar o pedido para a edge function.");
        }

        if (error instanceof FunctionsFetchError) {
          throw new Error("Não foi possível contactar a edge function publicada no Supabase.");
        }

        throw error;
      }

      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Conta criada", description: "Entregue o email, a password temporária e o PIN ao colaborador." });
      setOpen(false);
      setForm({ email: "", password: "123456", full_name: "", role: "worker", pin: "0000" });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const roleLabel = (role: string) => {
    switch (role) {
      case "boss":
        return "Patrão";
      case "admin":
        return "Administrador";
      default:
        return "Trabalhador";
    }
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold">Trabalhadores</h1>
          <p className="text-muted-foreground">Gerir a equipa Bertivan e os acessos de presença por telemóvel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Trabalhador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Esta criação deve ser feita por backend com permissão de administrador. Depois o colaborador entra uma vez no telemóvel e usa o PIN nas marcações.
              </div>
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@bertivan.pt" />
              </div>
              <div className="space-y-2">
                <Label>Password temporária</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground">O colaborador usa esta password no primeiro acesso. Depois a sessão fica guardada no equipamento.</p>
              </div>
              <div className="space-y-2">
                <Label>PIN (4 dígitos)</Label>
                <Input
                  type="tel"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as AppRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Trabalhador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="boss">Patrão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createWorker.mutate()} disabled={createWorker.isPending}>
                {createWorker.isPending ? "A criar..." : "Criar Conta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex gap-3 pt-6">
            <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Fluxo recomendado no telemóvel</p>
              <p className="text-sm text-muted-foreground">
                O colaborador inicia sessão uma vez, instala a app no ecrã principal e marca entrada ou saída com PIN e localização.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-3 pt-6">
            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Contas geridas pela empresa</p>
              <p className="text-sm text-muted-foreground">
                O registo deve ser controlado pela administração. O trabalhador não cria a própria conta nem escolhe a própria função.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers?.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.full_name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>
                      <Badge variant={worker.role === "admin" ? "default" : worker.role === "boss" ? "secondary" : "outline"}>
                        {roleLabel(worker.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={worker.is_active ? "default" : "destructive"}>{worker.is_active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!workers?.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Nenhum trabalhador encontrado.
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

export default Workers;
