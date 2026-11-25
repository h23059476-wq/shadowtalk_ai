import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Webfonts: Sora (headlines), Hanken Grotesk (body), JetBrains Mono (mono)
// — the exact families the landing page loads, bundled via @fontsource so
// renders never touch the network for type.
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

registerRoot(RemotionRoot);
