import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Clock, Users, MapPin, BarChart3, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppSidebar = () => {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [logoError, setLogoError] = useState(false);

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["admin", "boss", "worker"] },
    { label: "Marcar Ponto", icon: Clock, path: "/attendance", roles: ["admin", "boss", "worker"] },
    { label: "Perfil", icon: Settings, path: "/profile", roles: ["admin", "boss", "worker"] },
    { label: "Trabalhadores", icon: Users, path: "/workers", roles: ["admin"] },
    { label: "Obras", icon: MapPin, path: "/sites", roles: ["admin"] },
    { label: "Horários", icon: BarChart3, path: "/reports", roles: ["admin", "boss"] },
  ].filter((item) => role && item.roles.includes(role));

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {!logoError ? (
            <div className="h-10 w-10 overflow-hidden rounded-xl shadow-sm">
              <img
                src="/bertivan-logo.png"
                alt="Bertivan"
                className="h-full w-full object-cover"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="font-display text-sm font-bold">B</span>
            </div>
          )}
          <div>
            <h2 className="font-display text-sm font-bold">Bertivan</h2>
            <p className="text-xs text-sidebar-foreground/60">Presenças de Obra</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => handleNavigate(item.path)}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs capitalize text-sidebar-foreground/60">
              {role === "boss" ? "Patrão" : role === "admin" ? "Administrador" : "Trabalhador"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
