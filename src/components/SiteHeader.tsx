import { getUser } from "@/lib/auth";
import { HeaderBar } from "./HeaderBar";

export async function SiteHeader() {
  const user = await getUser();
  return <HeaderBar loggedIn={!!user} />;
}
