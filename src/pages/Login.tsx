import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password, true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Credenciais inválidas";
      toast({
        title: "Erro ao entrar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.3),_transparent_35%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(215_55%_18%))] p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="pb-2 text-center">
          {!logoError ? (
            <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-2xl shadow-md">
              <img
                src="/bertivan-logo.png"
                alt="Bertivan"
                className="h-full w-full object-cover"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <span className="font-display text-lg font-bold">B</span>
            </div>
          )}
          <CardTitle className="font-display text-2xl font-bold">Bertivan</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Registo de entradas e saídas por local de obra</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nome@bertivan.pt" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? "A entrar..." : "Entrar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              O colaborador entra no telemóvel da empresa e depois usa o PIN para marcar entrada e saída na obra.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Todos os perfis marcam presença na app. A consulta de horários e presenças fica reservada à administração.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
