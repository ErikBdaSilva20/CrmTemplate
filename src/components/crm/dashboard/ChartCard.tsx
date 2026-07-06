import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  headerAction?: ReactNode;
  hasData: boolean;
  emptyMessage?: string;
  height?: number;
  children: ReactNode;
}

export function ChartCard({
  title,
  headerAction,
  hasData,
  emptyMessage = "Nenhum dado",
  height = 180,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          children
        ) : (
          <div
            style={{ height }}
            className="flex items-center justify-center text-muted-foreground text-sm"
          >
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
