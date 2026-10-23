import { Player } from "./player";

export const metadata = { title: "Demo", robots: { index: false, follow: false } };

export default function DemoPage() {
  return <Player />;
}
