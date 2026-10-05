import { ClientGame } from "@/components/ClientGame";

/** The whole game lives on this one route, driven by view.phase (plan §09). */
export default function Home() {
  return <ClientGame />;
}
