import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BarChart3, Users, Code2, Globe, Zap, Clock } from "lucide-react";
import { backend } from "@/integrations/local/client";

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return (
    <span ref={ref} className="font-mono font-bold text-3xl md:text-4xl counter-glow">
      {displayed.toLocaleString()}{suffix}
    </span>
  );
}

const AboutStats = () => {
  const [stats, setStats] = useState([
    { icon: Users, label: "Registered Users", value: 0, suffix: "", color: "text-primary" },
    { icon: Zap, label: "AI Conversations", value: 0, suffix: "", color: "text-success" },
    { icon: Globe, label: "Scans Completed", value: 0, suffix: "", color: "text-accent" },
    { icon: Code2, label: "Bug Reports Tracked", value: 0, suffix: "", color: "text-secondary" },
    { icon: Clock, label: "Feedback Received", value: 0, suffix: "", color: "text-warning" },
    { icon: BarChart3, label: "Avg Rating", value: 0, suffix: "", color: "text-primary" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, convsRes, scansRes, bugsRes, feedbackRes, ratingsRes] = await Promise.all([
        backend.from("public_profiles").select("id", { count: "exact", head: true }),
        backend.from("conversations").select("id", { count: "exact", head: true }),
        backend.from("cyber_scan_results").select("id", { count: "exact", head: true }),
        backend.from("bug_bounty_submissions").select("id", { count: "exact", head: true }),
        backend.from("feedback").select("id", { count: "exact", head: true }),
        backend.from("feedback").select("rating").not("rating", "is", null),
      ]);

      const ratings = ratingsRes.data || [];
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length) * 10) / 10
        : 0;

      setStats([
        { icon: Users, label: "Registered Users", value: usersRes.count || 0, suffix: "", color: "text-primary" },
        { icon: Zap, label: "AI Conversations", value: convsRes.count || 0, suffix: "", color: "text-success" },
        { icon: Globe, label: "Scans Completed", value: scansRes.count || 0, suffix: "", color: "text-accent" },
        { icon: Code2, label: "Bug Reports Tracked", value: bugsRes.count || 0, suffix: "", color: "text-secondary" },
        { icon: Clock, label: "Feedback Received", value: feedbackRes.count || 0, suffix: "", color: "text-warning" },
        { icon: BarChart3, label: "Avg Rating", value: avgRating, suffix: "/5", color: "text-primary" },
      ]);
    };
    fetchStats();
  }, []);

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 glass-subtle rounded-full px-5 py-2 mb-6"
          >
            <BarChart3 className="h-4 w-4 text-warning" />
            <span className="text-sm text-muted-foreground font-medium">By the Numbers</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Live Platform Metrics
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-muted-foreground">
            Real-time numbers pulled directly from our backend.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
              className="glass-subtle rounded-xl p-6 text-center group hover:border-primary/20 transition-all"
            >
              <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="text-xs text-muted-foreground mt-2 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutStats;
