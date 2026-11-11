import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Calendar } from "lucide-react";

const PrivacyPolicyPage = () => {
  const lastUpdated = "January 15, 2026";

  const sections = [
    {
      title: "1. Information We Collect",
      content: `We collect information you provide directly to us, including:
      
• **Account Information**: When you create an account, we collect your email address, name, and password.
• **Usage Data**: We collect information about how you use our services, including conversation history, feature usage, and preferences.
• **Device Information**: We may collect device identifiers, browser type, and operating system information.
• **Payment Information**: ShadowTalk AI is free to use and does not collect payments. If you use a paid AI provider under BYOK, your payment details stay with that provider — we never see them.

We do NOT collect or store the content of your conversations in offline mode, as all processing happens locally on your device.`
    },
    {
      title: "2. How We Use Your Information",
      content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Process transactions and send related information
• Send technical notices, updates, and security alerts
• Respond to your comments, questions, and support requests
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent fraudulent transactions and abuse

We do NOT use your conversations to train our AI models. Your data remains private and is only used to provide the service to you.`
    },
    {
      title: "3. Data Storage and Security",
      content: `We implement appropriate technical and organizational measures to protect your personal information:

• **Encryption**: All data is encrypted in transit using TLS 1.3 and at rest using AES-256.
• **Access Controls**: Strict access controls limit who can access your data.
• **Regular Audits**: We conduct regular security audits and penetration testing.
• **SOC 2 Compliance**: We maintain SOC 2 Type II certification.

For offline mode, all data remains on your device and is never transmitted to our servers.`
    },
    {
      title: "4. Data Sharing and Disclosure",
      content: `We do not sell your personal information. We may share your information only in the following circumstances:

• **With Your Consent**: When you explicitly authorize us to share information.
• **Service Providers**: With trusted third parties who assist in operating our services.
• **Legal Requirements**: When required by law or to protect our rights.
• **Business Transfers**: In connection with a merger, acquisition, or sale of assets.`
    },
    {
      title: "5. Your Rights and Choices",
      content: `You have the following rights regarding your personal information:

• **Access**: Request a copy of your personal data.
• **Correction**: Request correction of inaccurate data.
• **Deletion**: Request deletion of your personal data.
• **Export**: Download your data in a portable format.
• **Opt-out**: Unsubscribe from marketing communications.

To exercise these rights, visit your account settings or contact us at privacy@shadowtalk-ai.com.`
    },
    {
      title: "6. Data Retention",
      content: `We retain your personal information for as long as necessary to:

• Provide our services to you
• Comply with legal obligations
• Resolve disputes and enforce agreements

You can delete your account and associated data at any time from your profile settings. Conversation history is automatically deleted after 90 days of account inactivity, unless you choose to retain it.`
    },
    {
      title: "7. International Data Transfers",
      content: `Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place:

• Standard Contractual Clauses for EU data transfers
• Compliance with applicable data protection laws
• Data processing agreements with all service providers`
    },
    {
      title: "8. Children's Privacy",
      content: `Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us at privacy@shadowtalk-ai.com.`
    },
    {
      title: "9. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. We will notify you of any changes by:

• Posting the new Privacy Policy on this page
• Updating the "Last Updated" date
• Sending you an email notification for significant changes

We encourage you to review this Privacy Policy periodically.`
    },
    {
      title: "10. Contact Us",
      content: `If you have questions about this Privacy Policy or our privacy practices, please contact us at:

**Email**: privacy@shadowtalk-ai.com
**Address**: Karachi, Pakistan

For data protection inquiries in the EU, you may also contact our Data Protection Officer at dpo@shadowtalk-ai.com.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Shield className="h-3 w-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-8">
            <CardContent className="p-6">
              <p className="text-muted-foreground leading-relaxed">
                At ShadowTalk AI, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our AI assistant platform. 
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy 
                policy, please do not access the service.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold mb-4">{section.title}</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
