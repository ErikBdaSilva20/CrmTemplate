import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Building2, ClipboardList, Handshake, Plus, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SystemRequirementsWidget } from './SystemRequirementsWidget';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contatos',
  '/companies': 'Empresas',
  '/deals': 'Negócios',
  '/activities': 'Atividades',
  '/tasks': 'Tarefas',
  '/sales-goals': 'Metas',
};

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const quickActions = [
    { label: 'Novo Contato', icon: Users, path: '/contacts?action=new' },
    { label: 'Nova Empresa', icon: Building2, path: '/companies?action=new' },
    { label: 'Novo Negócio', icon: Handshake, path: '/deals?action=new' },
    { label: 'Nova Atividade', icon: ClipboardList, path: '/activities?action=new' },
  ];

  const parts: { label: string; href?: string }[] = [{ label: 'CellRM', href: '/dashboard' }];

  if (location.pathname.startsWith('/deals/') && location.pathname !== '/deals') {
    parts.push({ label: 'Negócios', href: '/deals' });
    parts.push({ label: 'Detalhe' });
  } else {
    parts.push({ label: routeLabels[location.pathname] || 'Página' });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b border-border bg-background/80 px-3 sm:px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" aria-label="Alternar sidebar" />

      <Breadcrumb className="flex-1 hidden sm:flex">
        <BreadcrumbList>
          {parts.map((part, i) => (
            <span key={i} className="contents">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i < parts.length - 1 && part.href ? (
                  <BreadcrumbLink href={part.href}>{part.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{part.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <span className="flex-1 text-sm font-medium sm:hidden truncate">
        {parts[parts.length - 1].label}
      </span>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <SystemRequirementsWidget />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="default"
              className="h-8 w-8 rounded-full"
              aria-label="Ações rápidas"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {quickActions.map((action) => (
              <DropdownMenuItem key={action.path} onClick={() => navigate(action.path)}>
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
