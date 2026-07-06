import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CONTACT_STATUS } from "@/lib/domain";
import type { Contact } from "@/lib/data";

interface ContactsCardGridProps {
  contacts: Contact[];
  onCardClick: (id: string) => void;
}

export function ContactsCardGrid({ contacts, onCardClick }: ContactsCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {contacts.map((c) => (
        <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCardClick(c.id)}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {c.first_name[0]}
                  {c.last_name?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="font-medium truncate">
                  {c.first_name} {c.last_name}
                </p>
                {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
              </div>
            </div>
            {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
            <Badge variant="secondary" className={`text-[10px] ${CONTACT_STATUS[c.status || "lead"].badgeClassName}`}>
              {CONTACT_STATUS[c.status || "lead"].label}
            </Badge>
          </CardContent>
        </Card>
      ))}
      {contacts.length === 0 && (
        <div className="col-span-full py-10 text-center text-muted-foreground">Nenhum contato encontrado</div>
      )}
    </div>
  );
}
