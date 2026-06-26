import { Button } from "@/components/ui/button";
import { sairAction } from "@/lib/auth-actions";

export function LogoutButton() {
  return (
    <form action={sairAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );
}
