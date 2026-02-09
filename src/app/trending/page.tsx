import { redirect } from "next/navigation";

// Redirect old trending URL to popular
export default function TrendingRedirect() {
  redirect("/popular");
}
