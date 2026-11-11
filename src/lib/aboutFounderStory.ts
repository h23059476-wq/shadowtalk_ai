export interface FounderStoryChapter {
  id: string;
  title: string;
  body: string[];
  pullQuote?: string;
  pullQuoteAuthor?: string;
}

/** Web-adapted founder narrative — condensed from The Shadow Founder */
export const FOUNDER_STORY_CHAPTERS: FounderStoryChapter[] = [
  {
    id: "question",
    title: "Where do your words go?",
    body: [
      "At seventeen in Karachi, Zain Ahmed asked a question most people skip past when they open ChatGPT: what happens to the words you type when you're sad, stuck, or building something the world hasn't seen yet?",
      "Legacy AI keeps them. ShadowTalk was built so some conversations can fade — on purpose.",
    ],
  },
  {
    id: "room",
    title: "The room",
    body: [
      "People offered suggestions. Few sat down to help. So he learned to build alone — late nights, phonk in his headphones, deploy fixes at dawn.",
      "First-year student. No industry experience. To jealous voices, that sounded like a limit. To Zain, it was freedom — no permission required.",
    ],
    pullQuote: "Zain, be a man — you can do it alone.",
    pullQuoteAuthor: "What he told himself on the hard nights",
  },
  {
    id: "name",
    title: "Shadow fades. Talk stays.",
    body: [
      "Shadow — because not every thought should live forever on a foreign server. Talk — because asking, thinking, and building out loud still matters.",
      "He didn't wait for Silicon Valley or Stripe. He opened his laptop and shipped.",
    ],
  },
  {
    id: "messages",
    title: "Then the messages came",
    body: [
      "Strangers tried ShadowTalk and wrote back. Ejaz rated offline access 5/5 — \"everything I used felt heavy and smooth.\" An AI builder in the Agentic AI community called it commendable; the chatbot worked properly.",
      "Someone on WhatsApp asked: \"It's very nice.. You made it..?\" An automation engineer reviewed the architecture, then offered to help — after Zain told the truth about his age and experience.",
    ],
    pullQuote: "It's very nice.. You made it..?",
    pullQuoteAuthor: "Early tester · WhatsApp",
  },
  {
    id: "door",
    title: "Another door",
    body: [
      "Pakistan doesn't make it easy for a seventeen-year-old to collect payments online. Stripe wasn't built for him — so he built JazzCash, Easypaisa, bank transfer, and USDT checkout instead.",
      "Pro at Rs 1,499. Upload a receipt. Get verified. No waiting for permission from a payment processor half a world away.",
    ],
  },
  {
    id: "light",
    title: "Still writing it",
    body: [
      "Search ShadowTalk AI on Google. Nearly half his traffic is from the US. Revenue was zero for too long — not because the product failed, but because the last mile wasn't wired yet.",
      "The story isn't finished. Ejaz's heart reaction is in the screenshots. Tayyab said carry on. The podcast is next. The first Rs 1,499 from a stranger is the chapter after that.",
    ],
    pullQuote: "Yes. I made it. And I'm still making it. Come see.",
    pullQuoteAuthor: "Zain Ahmed · Founder, ShadowTalk AI",
  },
];

export const FOUNDER_STORY_INTRO = {
  badge: "The Founder Story",
  headline: "Built in a shadow. Seen in the light.",
  subhead:
    "Not a résumé — the short version of how a seventeen-year-old in Karachi built privacy-first AI while the world said wait.",
};
