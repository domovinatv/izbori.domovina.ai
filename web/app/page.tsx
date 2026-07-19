import { defaultSlug, getManifest } from "@/lib/data";
import { CyclePage } from "@/components/CyclePage";

export default async function Home() {
  const manifest = await getManifest();
  return <CyclePage slug={defaultSlug(manifest)} manifest={manifest} />;
}
