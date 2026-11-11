import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, AlertTriangle, Calendar, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getProfilePageSchema, FOUNDER_IMAGE_URL } from "@/lib/seo";
import { FOUNDER_CANONICAL } from "@/lib/founderIdentity";

export default function ZainAhmedBioPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const profileSchema = getProfilePageSchema();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        meta={{
          title: "Zain Ahmed — Founder of ShadowTalk AI | Biography",
          description: "The canonical biography of Zain Ahmed Fahad Patel, founder and lead architect of ShadowTalk AI. Learn his story from Light House Karachi to building an offline-first AI workspace.",
          canonical: "https://www.shadowtalk-ai.com/zain-ahmed",
          ogType: "profile",
          ogImage: FOUNDER_IMAGE_URL
        }}
        structuredData={profileSchema}
      />

      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-24 md:py-32 w-full">
        {/* Header Section (Hero) */}
        <div className="mb-12 border-b border-border pb-12">
          <Link to="/">
            <Button variant="ghost" className="mb-8 -ml-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden shrink-0 border border-border shadow-lg">
              <img
                src={FOUNDER_IMAGE_URL}
                alt="Zain Ahmed - Founder of ShadowTalk AI"
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Zain Ahmed</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Founder & Lead Architect, ShadowTalk AI
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <a href={FOUNDER_CANONICAL.linkedin} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">LinkedIn</Button>
                </a>
                <a href={FOUNDER_CANONICAL.instagram} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Instagram</Button>
                </a>
                <div className="flex items-center text-sm text-muted-foreground ml-auto bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Source: Founder for a Reason
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Facts */}
        <section className="mb-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-muted/30 p-6 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Full Name</h3>
            <p className="font-medium">Zain Ahmed Fahad Patel</p>
          </div>
          <div className="bg-muted/30 p-6 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Location</h3>
            <p className="font-medium">Karachi, Pakistan</p>
          </div>
          <div className="bg-muted/30 p-6 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Known For</h3>
            <p className="font-medium">ShadowTalk AI, Self-taught engineering</p>
          </div>
        </section>

        {/* Content Section */}
        <article className="prose prose-zinc dark:prose-invert max-w-none space-y-16">
          
          <section id="who-is">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Who is Zain Ahmed?</h2>
            <p className="text-xl leading-relaxed font-medium">
              Zain Ahmed is the founder and lead architect of ShadowTalk AI. His story began in eighth grade in Karachi, when an experience with ChatGPT during a power outage led him to wonder whether AI could work without an internet connection.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              A self-taught builder, Zain is known for developing the foundational architecture of ShadowTalk AI through persistent experimentation, starting entirely from borrowed devices and a determination to create offline-first software.
            </p>
          </section>

          <section id="how-started">
            <h2 className="text-3xl font-bold tracking-tight mb-6">How did he start ShadowTalk AI?</h2>
            <p className="text-xl leading-relaxed font-medium">
              He drafted the initial concept on paper over two nights after repeatedly losing access to AI tools during scheduled blackouts.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Without a mentor, he taught himself basic web development and utilized AI-assisted coding tools like Lovable. His first iteration was only a front-end shell that failed to respond because it lacked a backend. Through persistent trial and error, learning about API keys, GitHub, and backend infrastructure, he finally connected the pieces.
            </p>
          </section>

          <section id="known-for">
            <h2 className="text-3xl font-bold tracking-tight mb-6">What is he known for?</h2>
            <p className="text-xl leading-relaxed font-medium">
              Zain Ahmed is primarily known for founding ShadowTalk AI, his work in artificial intelligence development, and his background in self-taught cybersecurity.
            </p>
          </section>

          <hr className="border-border my-12" />

          {/* Zain Ahmed's Story */}
          <section id="story">
            <h2 className="text-4xl font-bold tracking-tight mb-8">Zain Ahmed's Story</h2>
            
            <div className="space-y-10">
              <div>
                <h3 className="text-2xl font-bold mb-4">Light House & The First ChatGPT Experience</h3>
                <p>
                  Growing up in the Light House neighborhood of Karachi, Zain's early digital life was shaped by borrowed devices—his mother's phone and his father's Lenovo ThinkPad. In the eighth grade, an early encounter with ChatGPT fundamentally changed his trajectory. Instead of just using the tool, his curiosity quickly turned technical: he began investigating how it worked.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">The Offline-AI Question</h3>
                <p>
                  Karachi's routine power outages (load shedding) were a constant interruption. Every blackout meant a severed connection to the cloud intelligence he was interacting with. This frustration crystallized into a single, persistent question: <em>Why can't this work without the internet?</em> This question became the seed for what would eventually become ShadowTalk.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Learning Without a Teacher & Cybersecurity</h3>
                <p>
                  While navigating formal schooling, Zain's self-directed technical education outpaced his classroom curriculum. He spent his free time teaching himself HTML, mastering cybersecurity tools like Nmap and Wireshark, and navigating Kali Linux command lines. During this period, he engaged in unauthorized experimentation on networks, exploring the boundaries of cybersecurity. These early explorations laid the groundwork for his later transition into legitimate ethical hacking and systems engineering.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">The First ShadowTalk Build, Failure, and Rebuilding</h3>
                <p>
                  After writing the concept down over two long nights, Zain used AI-assisted development tools to generate a user interface. But it was only a "dining room without a kitchen"—a front end with no backend. When he first tested it, it produced only silence. 
                </p>
                <p className="mt-4">
                  This period was marked by significant setbacks: his laptop was confiscated, he accidentally deleted a crucial Gmail account containing digital progress, and the original paper draft of ShadowTalk was torn up. Despite these compounding losses and a period of deep frustration, Zain chose to rebuild from his phone.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">The First "HI" & Becoming a Founder</h3>
                <p>
                  Once he had access to a laptop again, he successfully integrated a backend with an API key. He typed the word "HI" into the empty text box, and the system finally replied. From that single message, the project expanded. He deployed it globally, formed a team with his peers—and transitioned from a solo builder into the role of a founder.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-border my-12" />

          {/* Timeline */}
          <section id="timeline">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Timeline</h2>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">8th grade</span>
                  </div>
                  <p className="text-muted-foreground">First encountered ChatGPT and began wondering how AI worked. Power outages contributed to the idea of AI that could work offline.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">9th grade</span>
                  </div>
                  <p className="text-muted-foreground">Studied computer science and began exploring cybersecurity.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">9th–10th grade</span>
                  </div>
                  <p className="text-muted-foreground">Learned through experimentation and online tools.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">10th grade</span>
                  </div>
                  <p className="text-muted-foreground">Began building early versions of ShadowTalk.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Later</span>
                  </div>
                  <p className="text-muted-foreground">First successful AI response (typing "HI").</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">2024</span>
                  </div>
                  <p className="text-muted-foreground">ShadowTalk AI officially founded and deployed globally.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Later</span>
                  </div>
                  <p className="text-muted-foreground">Team and community formed, leading to sustained user growth.</p>
                </div>
              </div>

            </div>
          </section>

          <hr className="border-border my-12" />

          <section id="shadowtalk-ai">
            <h2 className="text-3xl font-bold tracking-tight mb-6">ShadowTalk AI</h2>
            <p className="text-lg leading-relaxed">
              ShadowTalk AI is a local-first, agentic workspace designed to execute complex tasks, run models offline, and provide privacy-preserving end-to-end encryption. What began as a teenager's attempt to circumvent unreliable internet access in Karachi has grown into a sovereign AI ecosystem.
            </p>
          </section>

          <section id="founder-for-a-reason">
            <h2 className="text-3xl font-bold tracking-tight mb-6 italic">Founder for a Reason</h2>
            <p className="text-xl text-muted-foreground italic mb-4">The Story of Zain Ahmed and the Making of ShadowTalk AI</p>
            <p className="text-lg leading-relaxed">
              This biography draws from the book draft <em>Founder for a Reason</em>. The text documents Zain's journey from the early ChatGPT experience and the offline-AI question through learning, failed builds, setbacks, rebuilding, ShadowTalk's development, and his transition from an individual builder to a founder.
            </p>
          </section>

          {/* Media / Screenshots placeholder section */}
          <section id="media">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Media & Documentation</h2>
            <div className="bg-muted/30 border border-border border-dashed rounded-xl p-12 text-center">
              <p className="text-muted-foreground">
                [ Early Build Screenshot Placeholder ] <br/>
                <em>Visual documentation of early front-end shells, broken versions, and the first working iteration of ShadowTalk.</em>
              </p>
            </div>
            <div className="bg-muted/30 border border-border border-dashed rounded-xl p-12 text-center mt-6">
              <p className="text-muted-foreground">
                [ Analytics & Current UI Placeholder ] <br/>
                <em>Authentic screenshots representing growth milestones and the current architecture.</em>
              </p>
            </div>
          </section>

          <hr className="border-border my-12" />

          {/* FAQ */}
          <section id="faq">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-lg">Did Zain Ahmed build ShadowTalk alone?</h4>
                <p className="text-muted-foreground mt-2">Zain built the foundational architecture and early versions of ShadowTalk entirely alone. As the project scaled, he formed a core team of peers to expand features like the social network component.</p>
              </div>
              <div>
                <h4 className="font-bold text-lg">How did Zain learn to code?</h4>
                <p className="text-muted-foreground mt-2">He is entirely self-taught, learning through search engines, experimentation, error-driven development, and tools like Lovable.</p>
              </div>
            </div>
          </section>

          {/* Verification Disclaimer */}
          <section id="verification" className="bg-muted/50 p-6 rounded-xl border border-border mt-12">
            <div className="flex items-start gap-4">
              <ShieldAlert className="w-6 h-6 text-muted-foreground shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">Sources, Verification & Disclaimer</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The narrative on this page is based on firsthand accounts provided by Zain Ahmed as documented in <em>Founder for a Reason</em>. Claims regarding specific user milestones (e.g., reaching 100 users in 10 hours, or scaling to 3,100 users globally) are presented according to Zain's own recollection rather than independently verified third-party analytics. 
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Accounts of early cybersecurity experimentation describe unauthorized network testing conducted by a minor without supervision. This is presented as part of his learning trajectory and development into an ethical hacker, but does not represent authorized or endorsed professional conduct during that period.
                </p>
              </div>
            </div>
          </section>

        </article>
      </main>

      <Footer />
    </div>
  );
}
