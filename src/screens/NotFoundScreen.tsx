import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
