import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Contact } from '@/lib/data';
import { User } from 'lucide-react';

export function DealContactCard({ contact }: { contact: Contact | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          Contato
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contact ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {contact.first_name[0]}
                {contact.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {contact.first_name} {contact.last_name}
              </p>
              {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum contato vinculado</p>
        )}
      </CardContent>
    </Card>
  );
}
