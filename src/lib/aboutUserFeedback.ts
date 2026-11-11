import type { LucideIcon } from "lucide-react";
import { MessageCircle, Star, Cpu, WifiOff, Bot } from "lucide-react";

export interface AboutUserFeedback {
  id: string;
  quote: string;
  quoteUr?: string;
  author: string;
  role: string;
  source: "WhatsApp" | "In-app" | "AI community" | "Engineer review";
  rating?: number;
  highlight?: string;
  icon: LucideIcon;
  date?: string;
}

/** Real user feedback shared by founder Zain Ahmed — not fabricated testimonials */
export const ABOUT_USER_FEEDBACK: AboutUserFeedback[] = [
  {
    id: "ejaz-5",
    quote:
      "I just tried it once — good experience, especially offline access with limited data. The user experience was also good. Everything I used felt heavy and smooth.",
    quoteUr: "Jo use kya us mein sb kuch bht heavy or smooth tha.",
    author: "Ejaz",
    role: "ShadowTalk user · Pakistan",
    source: "WhatsApp",
    rating: 5,
    highlight: "Offline + limited data",
    icon: WifiOff,
    date: "Mar 2026",
  },
  {
    id: "ai-community",
    quote: "That's really Commendable!!!! Chatbot is also working properly.",
    author: "AI builder",
    role: "Agentic AI Hands-On community",
    source: "AI community",
    highlight: "Chatbot verified working",
    icon: Bot,
    date: "2026",
  },
  {
    id: "early-tester",
    quote: "It's very nice.. You made it..?",
    author: "Early tester",
    role: "WhatsApp · first-time visitor",
    source: "WhatsApp",
    highlight: "You made it",
    icon: MessageCircle,
    date: "2026",
  },
  {
    id: "tayyab-engineer",
    quote:
      "Oh nice, carry on — it still needs improvements but in time you can fix them. I'm an AI and automation engineer; if you need information or assistance, reach out.",
    author: "Tayyab H.",
    role: "AI & Automation Engineer",
    source: "Engineer review",
    highlight: "Peer engineer offered help",
    icon: Cpu,
    date: "2026",
  },
  {
    id: "in-app-creator",
    quote: "Who created you? — Zain Ahmed. He's my awesome developer!",
    author: "Support chat user",
    role: "In-app · 24/7 AI Support",
    source: "In-app",
    highlight: "Users ask for the founder by name",
    icon: MessageCircle,
    date: "2026",
  },
];

export const ABOUT_MARQUEE_QUOTES = [
  "Offline access with limited data — good experience. — Ejaz, 5/5",
  "That's really Commendable!!!! Chatbot working properly. — AI builder",
  "It's very nice.. You made it..?",
  "Everything was heavy and smooth — 5/5",
  "Built by Zain Ahmed — a first-year student, no industry experience.",
  "An AI engineer said: carry on, reach out if you need help.",
  "Privacy-first AI for people who take their data seriously.",
];

export const ABOUT_FEEDBACK_HIGHLIGHTS = {
  topRating: 5,
  ratedBy: "Ejaz",
  offlinePraised: true,
  chatbotVerified: true,
  engineerEndorsed: true,
};
