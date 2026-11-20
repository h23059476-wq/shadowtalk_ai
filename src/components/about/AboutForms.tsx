import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { backend } from "@/integrations/local/client";
import {
  MessageCircle, Bug, Handshake, Rocket,
  Send, Loader2, CheckCircle2
} from "lucide-react";
import { FollowUsSection } from "@/components/FollowUsSection";

type FormType = "contact" | "feedback" | "partnership" | "waitlist";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const initialForm: FormState = { name: "", email: "", subject: "", message: "" };

const tabs: { value: FormType; label: string; icon: React.ElementType }[] = [
  { value: "contact", label: "Contact", icon: MessageCircle },
  { value: "feedback", label: "Feedback", icon: Bug },
  { value: "partnership", label: "Partnership", icon: Handshake },
  { value: "waitlist", label: "Waitlist", icon: Rocket },
];

const AboutForms = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FormType>("contact");
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    if (!form.name.trim() || form.name.length > 100) return "Name is required (max 100 chars)";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Valid email is required";
    if (activeTab !== "waitlist" && !form.message.trim()) return "Message is required";
    if (form.message.length > 2000) return "Message too long (max 2000 chars)";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Validation Error", description: err, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await backend.functions.invoke("sendContactEmail", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: `[${activeTab.toUpperCase()}] ${form.subject.trim() || activeTab}`,
          message:
            activeTab === "waitlist"
              ? `Waitlist signup from ${form.name} (${form.email}). ${form.message || ""}`
              : form.message.trim(),
          source: `About Page — ${activeTab}`,
        },
      });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }

      setSubmitted(true);
      setForm(initialForm);
      toast({ title: "Sent!", description: "We'll get back to you soon." });
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const placeholders: Record<FormType, { subject: string; message: string }> = {
    contact: { subject: "How can we help?", message: "Tell us what's on your mind…" },
    feedback: { subject: "Feature / Bug title", message: "Describe your feedback or bug report…" },
    partnership: { subject: "Partnership proposal", message: "Tell us about your organization and how we can collaborate…" },
    waitlist: { subject: "Feature you're excited about", message: "(Optional) Anything you'd like us to know?" },
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">Get in Touch</h2>
          <p className="text-muted-foreground text-sm">
            Reach out for anything — questions, feedback, partnerships, or early access.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="glass-subtle border-border/40 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <CardContent className="p-6 sm:p-8">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as FormType);
                  setSubmitted(false);
                }}
              >
                <TabsList className="w-full grid grid-cols-4 mb-6">
                  {tabs.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} className="gap-1.5 text-xs sm:text-sm">
                      <Icon className="h-3.5 w-3.5 hidden sm:block" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {tabs.map(({ value }) => (
                  <TabsContent key={value} value={value}>
                    {submitted ? (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 gap-3"
                      >
                        <CheckCircle2 className="h-12 w-12 text-success" />
                        <p className="text-lg font-semibold">Thank you!</p>
                        <p className="text-sm text-muted-foreground">
                          We've received your {value} submission.
                        </p>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            placeholder="Your name"
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            maxLength={100}
                            required
                            className="bg-muted/30 border-border/50"
                          />
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={(e) => update("email", e.target.value)}
                            maxLength={255}
                            required
                            className="bg-muted/30 border-border/50"
                          />
                        </div>
                        <Input
                          placeholder={placeholders[value].subject}
                          value={form.subject}
                          onChange={(e) => update("subject", e.target.value)}
                          maxLength={200}
                          className="bg-muted/30 border-border/50"
                        />
                        <Textarea
                          placeholder={placeholders[value].message}
                          value={form.message}
                          onChange={(e) => update("message", e.target.value)}
                          maxLength={2000}
                          rows={5}
                          required={value !== "waitlist"}
                          className="bg-muted/30 border-border/50 resize-none"
                        />
                        <Button
                          type="submit"
                          className="w-full btn-glow gap-2"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />{" "}
                              {value === "waitlist" ? "Join Waitlist" : "Send Message"}
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10"
        >
          <FollowUsSection description="While you wait for a reply — follow @shadowtalk.ai and Zain on LinkedIn." />
        </motion.div>
      </div>
    </section>
  );
};

export default AboutForms;
