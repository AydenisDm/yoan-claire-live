import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountScreen } from "@/components/account-screen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot")({ component: Forgot });

function Forgot() {
  return (
    <AccountScreen
      title="Forgot password"
      subtitle="Email reset is not set up on this site. You will not be left on a dead end."
    >
      <div className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-5">
        <p className="text-sm leading-relaxed text-muted">
          There is no “send a reset link” path here. If you still know the password, sign
          in. If you do not, create a new camera account with a different email — the old
          one stays unused.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to="/login" viewTransition>
            Back to host sign in
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link to="/register" viewTransition>
            Create a new camera account
          </Link>
        </Button>
      </div>
    </AccountScreen>
  );
}
