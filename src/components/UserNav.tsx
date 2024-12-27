import { UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export default function UserNav() {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="flex gap-4">
        <Link to="/sign-in">
          <Button variant="ghost">Sign in</Button>
        </Link>
        <Link to="/sign-up">
          <Button>Sign up</Button>
        </Link>
      </div>
    );
  }

  return <UserButton afterSignOutUrl="/sign-in" />;
} 