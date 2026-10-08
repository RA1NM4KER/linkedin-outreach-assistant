import { Dashboard } from "@/components/Dashboard";
import { getState } from "@/lib/storage/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <Dashboard initialState={await getState()} />;
}
