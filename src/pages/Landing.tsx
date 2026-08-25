import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Nfc, QrCode, Smartphone, Palette, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { ProfileView, PhoneFrame } from "@/components/ProfileView";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";

const demoCustomer = {
  username: "yahiahani",
  full_name: "Yahia Hani",
  job_title: "Founder, OSHEGAH",
  bio: "One tap. Every way to reach me.",
  location: "Cairo, Egypt",
  verified: true,
  theme: "oshegah_dark",
};

const demoLinks = [
  { id: "1", type: "whatsapp", title: "WhatsApp", value: "+201000000000" },
  { id: "2", type: "instagram", title: "Instagram", value: "oshegah" },
  { id: "3", type: "website", title: "Website", value: "oshegah.com" },
  { id: "4", type: "instapay", title: "InstaPay", value: "yahia@instapay" },
];

const features = [
  { icon: Nfc, title: "NFC + QR ready", text: "Tap or scan your card and your profile opens instantly — no app needed." },
  { icon: Palette, title: "Premium themes", text: "Five curated themes, custom accent colors, and three button styles." },
  { icon: BarChart3, title: "Real analytics", text: "See profile views, link clicks and your best-performing link." },
  { icon: Smartphone, title: "Save Contact", text: "Visitors save your details to their phone with one tap via vCard." },
  { icon: QrCode, title: "Share anywhere", text: "Download a high-resolution QR code for print, email or signage." },
  { icon: ShieldCheck, title: "Business ready", text: "Manage every team member's card from one business dashboard." },
];

export default function Landing() {
  const { user, profile, isAdmin } = useAuth();
  const home = homeRouteFor(profile, isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Wordmark />
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            {user ? (
              <Button asChild><Link to={home}>Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                <Button asChild><Link to="/signup">Get your card</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow text-muted-foreground">Digital identity platform</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Your whole presence on one premium NFC card.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              OSHEGAH pairs a physical NFC and QR card with a beautiful digital profile — links,
              payments, contact details and analytics, all in one tap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? home : "/signup"}>
                  {user ? "Go to dashboard" : "Create your profile"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/yahiahani">See a live profile</Link>
              </Button>
            </div>
          </div>
          <PhoneFrame>
            <ProfileView customer={demoCustomer} links={demoLinks} compact />
          </PhoneFrame>
        </section>

        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto w-full max-w-6xl px-5">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Everything your card should do</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold">Ready to hand out your last paper card?</h2>
          <p className="mt-4 text-muted-foreground">
            Set up your OSHEGAH profile in minutes and start tracking every connection.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to={user ? home : "/signup"}>Get started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Wordmark />
          <p>© {new Date().getFullYear()} OSHEGAH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
