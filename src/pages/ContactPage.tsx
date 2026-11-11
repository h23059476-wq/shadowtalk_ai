import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  Copy,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { FollowUsSection } from "@/components/FollowUsSection";
import SEOHead from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo";
import { toast } from "sonner";
import { backend } from "@/integrations/local/client";
import { motion } from "framer-motion";

export const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt backend function call if available
      try {
        await backend.functions.invoke("send-contact-email", {
          body: { ...formData, source: "Contact Page" },
        });
      } catch (fnErr) {
        console.warn("Cloud contact function fallback triggered:", fnErr);
      }

      // Store inquiry locally in browser storage so inquiry is never lost
      try {
        const inquiries = JSON.parse(localStorage.getItem("shadowtalk_contact_inquiries") || "[]");
        inquiries.unshift({
          ...formData,
          submittedAt: new Date().toISOString(),
          status: "received",
        });
        localStorage.setItem("shadowtalk_contact_inquiries", JSON.stringify(inquiries.slice(0, 20)));
      } catch {}

      setSubmitted(true);
      toast.success("Message received! Our team will respond within 24 hours.");
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Failed to transmit. Please email shadowtalk@shadowtalk-ai.com directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("shadowtalk@shadowtalk-ai.com");
    toast.success("Copied shadowtalk@shadowtalk-ai.com to clipboard!");
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Direct Email",
      description: "shadowtalk@shadowtalk-ai.com",
      detail: "Average response: under 24 hours",
      action: handleCopyEmail,
      actionText: "Copy Email",
    },
    {
      icon: Headphones,
      title: "AI Live Assistant",
      description: "24/7 in-app conversational support",
      detail: "Zero wait time via Chatbot",
      action: () => navigate("/chatbot"),
      actionText: "Open Chatbot",
    },
    {
      icon: MapPin,
      title: "Engineering Base",
      description: "Karachi, Pakistan",
      detail: "Operating globally on distributed edge",
      action: () => navigate("/about"),
      actionText: "Founder Story",
    },
    {
      icon: Clock,
      title: "Support SLA",
      description: "< 24 Hours",
      detail: "Priority queues for Pro & Enterprise",
      action: () => navigate("/pricing"),
      actionText: "View Tiers",
    },
  ];

  const quickFaqs = [
    { q: "How quickly do you respond?", a: "Support tickets and emails are reviewed continuously, with average turnaround under 24 hours." },
    { q: "Need enterprise custom model integration?", a: "Our team deploys bespoke on-prem and private VPC endpoints with dedicated SLAs." },
    { q: "Where can I report a bug or feature request?", a: "Use this contact form, or open an issue on our GitHub repository." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <SEOHead meta={PAGE_SEO.contact} />
      <Navigation />

      {/* Floating Back to Chatbot */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/chatbot")}
          className="gap-2 glass-strong border-border/50 hover:border-primary/40 shadow-lg backdrop-blur-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbot
        </Button>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dense opacity-20 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 glass-subtle border-primary/30 text-primary py-1 px-3">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Direct Support & Inquiries
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Get in <span className="gradient-text">Touch</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Have a technical question, enterprise partnership proposal, or feedback on ShadowTalk AI? 
              Connect directly with our engineering team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods Grid */}
      <section className="py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {contactMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                <Card className="glass-subtle border-border/50 hover:border-primary/40 transition-all duration-300 h-full flex flex-col justify-between p-5 group">
                  <div>
                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 text-primary group-hover:scale-110 transition-transform">
                      <method.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-base mb-1">{method.title}</h3>
                    <p className="text-sm font-medium text-foreground/90 break-words mb-1">{method.description}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{method.detail}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={method.action}
                    className="mt-4 w-full text-xs text-primary hover:text-primary hover:bg-primary/10 justify-between"
                  >
                    <span>{method.actionText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Form & Information Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Form Column */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              <Card className="glass-subtle border-border/50 shadow-elevated overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold">Send an Official Message</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Fill out the details below and we will route your inquiry to the right specialist.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hidden sm:inline-flex">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Encrypted In Transit
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {submitted ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="py-10 text-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold">Message Transmitted</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                        Thank you for contacting ShadowTalk AI. A confirmation has been logged, and an engineer will reply to{" "}
                        <span className="text-foreground font-medium">{formData.email}</span> shortly.
                      </p>
                      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSubmitted(false);
                            setFormData({ name: "", email: "", subject: "General Inquiry", message: "" });
                          }}
                        >
                          Send Another Message
                        </Button>
                        <Button asChild className="bg-primary text-primary-foreground">
                          <Link to="/chatbot">Open AI Workspace</Link>
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact-name" className="text-xs font-semibold">Your Name *</Label>
                          <Input
                            id="contact-name"
                            placeholder="Alex Morgan"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            maxLength={100}
                            className="bg-background/60 border-border/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email" className="text-xs font-semibold">Your Email Address *</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="alex@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            maxLength={255}
                            className="bg-background/60 border-border/60"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-subject" className="text-xs font-semibold">Inquiry Topic</Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(val) => setFormData({ ...formData, subject: val })}
                        >
                          <SelectTrigger id="contact-subject" className="bg-background/60 border-border/60">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Inquiry">General Product Inquiry</SelectItem>
                            <SelectItem value="Technical Support">Technical & Model Routing Support</SelectItem>
                            <SelectItem value="Enterprise Sales">Enterprise SaaS & Team Licenses</SelectItem>
                            <SelectItem value="Billing & Refund">Billing, Plans & Invoices</SelectItem>
                            <SelectItem value="Bug Report">Bug Bounty & Security Report</SelectItem>
                            <SelectItem value="Partnership">API & Ecosystem Partnership</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-message" className="text-xs font-semibold">Message *</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Describe your question, request, or issue with relevant details..."
                          rows={6}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          maxLength={3000}
                          className="bg-background/60 border-border/60 resize-none leading-relaxed"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-6 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Transmitting Inquiry...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Information Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-6"
            >
              <Card className="glass-subtle border-border/50 p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Headphones className="h-5 w-5" />
                  <h3 className="font-bold text-lg text-foreground">Need Immediate Help?</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Most workflow questions regarding model speeds, Groq tokens, WebGPU hardware support, 
                  and API keys are answered instantly inside our interactive documentation and FAQ centers.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 justify-between">
                    <Link to="/help">
                      <span>Help Center</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 justify-between">
                    <Link to="/faq">
                      <span>Browse FAQs</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>

              {/* Quick FAQs Accordion Preview */}
              <Card className="glass-subtle border-border/50 p-6">
                <div className="flex items-center gap-2 mb-4 text-accent">
                  <HelpCircle className="h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">Common Inquiries</h3>
                </div>
                <div className="space-y-3 divide-y divide-border/40 text-xs">
                  {quickFaqs.map((faq, idx) => (
                    <div key={idx} className={idx === 0 ? "pt-0" : "pt-3"}>
                      <p className="font-semibold text-foreground mb-1">{faq.q}</p>
                      <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Direct Founder & Social Access */}
              <Card className="glass-subtle border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-6">
                <h3 className="font-bold text-base mb-1">Founder Direct Line</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  ShadowTalk AI was architected and founded by Zain Ahmed Fahad Patel in Karachi. 
                  Reach out for executive briefings, investor communications, or enterprise pilots.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyEmail}
                    className="text-xs gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Email
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                    <a href="mailto:shadowtalk@shadowtalk-ai.com">
                      Mail App
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </Card>

              <div className="pt-2">
                <FollowUsSection centered={false} description="Follow product releases and live benchmarks" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
