import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import {
  Activity,
  Building2,
  CheckSquare,
  Filter,
  Handshake,
  LayoutDashboard,
  LogOut,
  Settings,
  Target,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const generalItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Contatos', url: '/contacts', icon: Users },
  { title: 'Empresas', url: '/companies', icon: Building2 },
  { title: 'Negócios', url: '/deals', icon: Handshake },
  { title: 'Atividades', url: '/activities', icon: Activity },
  { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
];

const analyticsItems = [
  { title: 'Metas', url: '/sales-goals', icon: Target },
  { title: 'Filtros Salvos', url: '/segments', icon: Filter },
];

const adminItems = [{ title: 'Configurações', url: '/settings', icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const renderNavGroup = (items: typeof generalItems, label?: string) => (
    <SidebarGroup>
      <SidebarGroupContent>
        {label && !collapsed && (
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        )}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <NavLink
                  to={item.url}
                  end={item.url === '/dashboard'}
                  className="hover:bg-accent/50"
                  activeClassName="bg-accent text-accent-foreground font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Handshake className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">FlowCRM</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderNavGroup(generalItems, 'Geral')}
        {renderNavGroup(analyticsItems, 'Analytics')}
        {renderNavGroup(adminItems, 'Admin')}
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{user?.name || 'Usuário'}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
