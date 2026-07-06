import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  domain?: string | null;
  className?: string;
  iconClassName?: string;
}

// Clearbit's logo endpoint is public/best-effort (now under HubSpot) and can
// 404 or go away without notice — AvatarImage/AvatarFallback degrade to the
// icon automatically instead of leaving a blank gap.
export function CompanyLogo({ domain, className, iconClassName = "h-5 w-5" }: CompanyLogoProps) {
  return (
    <Avatar className={cn("rounded-lg", className)}>
      {domain && <AvatarImage src={`https://logo.clearbit.com/${domain}`} alt="" className="object-contain bg-muted" />}
      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
        <Building2 className={iconClassName} />
      </AvatarFallback>
    </Avatar>
  );
}
