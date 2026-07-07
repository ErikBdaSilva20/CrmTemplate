import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Company } from '@/lib/data';
import { Building2 } from 'lucide-react';

export function DealCompanyCard({ company }: { company: Company | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 className="h-4 w-4" />
          Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {company ? (
          <div>
            <p className="text-sm font-medium">{company.name}</p>
            {company.domain && <p className="text-xs text-muted-foreground">{company.domain}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada</p>
        )}
      </CardContent>
    </Card>
  );
}
