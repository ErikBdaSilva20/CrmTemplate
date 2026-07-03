// Centralized domain vocabulary (labels, badge colors, icons) for the schema
// enums (ContactStatus, DealStatus, ActivityType). Single source of truth:
// before this, each screen redefined its own statusColors/statusLabels/
// typeIcons maps (ContactsScreen, ContactDrawer, ContactsKanbanByStatus,
// DealsList, ActivitiesScreen, DealDetailScreen — see AUDITORIA-CODIGO.md
// §3.1), so a label or color change meant editing 3-4 files that drifted
// out of sync. Import from here instead of redefining locally.
import { Phone, Mail, CalendarDays, FileText, CheckSquare, type LucideIcon } from "lucide-react";
import type { ActivityType, ContactStatus, DealStatus } from "@/lib/data";

interface DomainEntry {
  label: string;
  badgeClassName: string;
}

export const CONTACT_STATUS: Record<ContactStatus, DomainEntry> = {
  lead: { label: "Lead", badgeClassName: "bg-primary/10 text-primary" },
  prospect: { label: "Prospect", badgeClassName: "bg-warning/10 text-warning" },
  customer: { label: "Cliente", badgeClassName: "bg-success/10 text-success" },
  churned: { label: "Churned", badgeClassName: "bg-destructive/10 text-destructive" },
};

export const CONTACT_STATUSES = Object.keys(CONTACT_STATUS) as ContactStatus[];

export const DEAL_STATUS: Record<DealStatus, DomainEntry> = {
  open: { label: "Aberto", badgeClassName: "bg-primary/10 text-primary" },
  won: { label: "Ganho", badgeClassName: "bg-success/10 text-success" },
  lost: { label: "Perdido", badgeClassName: "bg-destructive/10 text-destructive" },
};

interface ActivityDomainEntry extends DomainEntry {
  icon: LucideIcon;
  textClassName: string;
}

export const ACTIVITY_TYPE: Record<ActivityType, ActivityDomainEntry> = {
  call: {
    label: "Ligação",
    icon: Phone,
    textClassName: "text-emerald-600",
    badgeClassName: "bg-emerald-600/10 text-emerald-600",
  },
  email: {
    label: "Email",
    icon: Mail,
    textClassName: "text-blue-600",
    badgeClassName: "bg-blue-600/10 text-blue-600",
  },
  meeting: {
    label: "Reunião",
    icon: CalendarDays,
    textClassName: "text-amber-600",
    badgeClassName: "bg-amber-600/10 text-amber-600",
  },
  note: {
    label: "Nota",
    icon: FileText,
    textClassName: "text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground",
  },
  task: {
    label: "Tarefa",
    icon: CheckSquare,
    textClassName: "text-violet-600",
    badgeClassName: "bg-violet-600/10 text-violet-600",
  },
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE) as ActivityType[];
