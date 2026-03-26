import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, LockKeyhole, UserRound } from "lucide-react";

const Profile = () => {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detailsForm, setDetailsForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
  });
  const [pinForm, setPinForm] = useState({
    current_pin: "",
    new_pin: "",
    confirm_pin: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const roleLabel = role === "boss" ? "Patrão" : role === "admin" ? "Administrador" : "Trabalhador";

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil indisponível.");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: detailsForm.full_name.trim(),
          phone: detailsForm.phone.trim() || null,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Perfil atualizado" });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updatePin = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil indisponível.");
      if (pinForm.current_pin !== profile.pin) throw new Error("PIN atual incorreto.");
      if (pinForm.new_pin.length !== 4) throw new Error("O novo PIN deve ter 4 dígitos.");
      if (pinForm.new_pin !== pinForm.confirm_pin) throw new Error("Os PINs não coincidem.");

      const { error } = await supabase
        .from("profiles")
        .update({ pin: pinForm.new_pin })
        .eq("user_id", profile.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "PIN atualizado" });
      setPinForm({ current_pin: "", new_pin: "", confirm_pin: "" });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil indisponível.");
      if (!passwordForm.current_password) throw new Error("Indique a password atual.");
      if (passwordForm.new_password.length < 6) throw new Error("A nova password deve ter pelo menos 6 caracteres.");
      if (passwordForm.new_password !== passwordForm.confirm_password) throw new Error("As passwords não coincidem.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordForm.current_password,
      });
      if (verifyError) throw new Error("Password atual incorreta.");

      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password atualizada" });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Perfil</h1>
        <p className="text-muted-foreground">Gerir os seus dados de acesso e identificação na app.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-primary" />
              Dados da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={detailsForm.full_name} onChange={(e) => setDetailsForm({ ...detailsForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={detailsForm.phone} onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })} placeholder="910000000" />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Input value={roleLabel} disabled />
            </div>
            <Button className="w-full" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "A guardar..." : "Guardar dados"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Alterar PIN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>PIN atual</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={pinForm.current_pin}
                onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label>Novo PIN</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={pinForm.new_pin}
                onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar novo PIN</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={pinForm.confirm_pin}
                onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <Button className="w-full" onClick={() => updatePin.mutate()} disabled={updatePin.isPending}>
              {updatePin.isPending ? "A atualizar..." : "Atualizar PIN"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Alterar Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password atual</Label>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nova password</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova password</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={() => updatePassword.mutate()} disabled={updatePassword.isPending}>
              {updatePassword.isPending ? "A atualizar..." : "Atualizar password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
