import { redirect } from "next/navigation";

// Billing is intentionally unavailable until subscriptions and entitlements
// exist end-to-end. Keep old bookmarks safe without advertising a fake plan.
export default function PricingPage() {
  redirect("/");
}

/*

type TierId = "day" | "thru" | "guided";

interface TierWaypoint {
  label: string;
  desc: string;
  included: boolean;
}

interface Tier {
  id: TierId;
  tier: string;
  name: string;
  priceMo: string;
  priceYr: string | null;
  subtitle: string;
  chipClass: string;
  legendClass: string;
  accent: string;
  cardClass?: string;
  badge?: string;
  ctaLabel: string;
  ctaClass: string;
  waypoints: TierWaypoint[];
  footerNote?: string;
}

const TIERS: Tier[] = [
  {
    id: "day",
    tier: "Tier 01",
    name: "Day hike",
    priceMo: "$0",
    priceYr: null,
    subtitle: "Free forever",
    chipClass: "chip--ink",
    legendClass: "legend-label--dim",
    accent: "var(--text-dim)",
    ctaLabel: "Start with Day hike",
    ctaClass: "btn--ghost",
    waypoints: [
      { label: "3 routes / month", desc: "Map one new trail every ~10 days.", included: true },
      { label: "Progress tracking", desc: "Mark videos watched, waypoints lit up.", included: true },
      { label: "Anonymous or Google", desc: "Save your trails across devices.", included: true },
      { label: "Inspiration rail", desc: "Off-trail videos for detours.", included: true },
      { label: "Community trail logs", desc: "Browse what others shared.", included: false },
      { label: "Trail guide sessions", desc: "1:1 mentor calls on this route.", included: false },
    ],
    footerNote: "Upgrade anytime to keep mapping after 3.",
  },
  {
    id: "thru",
    tier: "Tier 02",
    name: "Thru-hike",
    priceMo: "$9",
    priceYr: "$86 / yr · save 20%",
    subtitle: "Most popular · for serious learners",
    chipClass: "chip--route",
    legendClass: "legend-label--route",
    accent: "var(--route)",
    badge: "Most popular",
    ctaLabel: "Choose Thru-hike",
    ctaClass: "btn--route",
    waypoints: [
      { label: "Unlimited routes", desc: "Map every trail you want, forever.", included: true },
      { label: "Edit syllabus order", desc: "Re-order waypoints & detours.", included: true },
      { label: "Inspiration rail +", desc: "Priority ranked tutorials.", included: true },
      { label: "Community trail logs", desc: "Publish logs, attach progress.", included: true },
      { label: "Community chat", desc: "Hikers on the same trail as you.", included: true },
      { label: "Trail guide sessions", desc: "Add credits a la carte.", included: false },
    ],
  },
  {
    id: "guided",
    tier: "Tier 03",
    name: "Guided expedition",
    priceMo: "$39",
    priceYr: "$390 / yr · 2 credits / mo",
    subtitle: "With a real human trail guide",
    chipClass: "chip--sage",
    legendClass: "legend-label--sage",
    accent: "var(--sage)",
    cardClass: "surface-card--paper",
    ctaLabel: "Book a trail guide",
    ctaClass: "btn--paper",
    waypoints: [
      { label: "Everything in Thru-hike", desc: "Unlimited routes, logs, community.", included: true },
      { label: "2 session credits / mo", desc: "45- or 60-min 1:1 with vetted guides.", included: true },
      { label: "Mentor-curated reviews", desc: "Guides review your syllabus & plan.", included: true },
      { label: "Priority video ranking", desc: "Your routes rank first in queues.", included: true },
      { label: "Apply to be a guide", desc: "Earn credits guiding others.", included: true },
      { label: "Team seats (soon)", desc: "Cohort or company billing.", included: false },
    ],
    footerNote: "Cancel or downgrade any time — credits expire after 30 days.",
  },
];

const FAQ = [
  {
    q: "What counts as a route on the free tier?",
    a: "A route is any syllabus you generate from a prompt. Regenerating the same prompt or editing waypoint order does not count. You get 3 fresh routes per calendar month on Day hike.",
  },
  {
    q: "Do unused monthly routes roll over?",
    a: "No — think of them as 3 new trails a month to try. Unlimited routes begin at Thru-hike, which removes the cap entirely.",
  },
  {
    q: "How does the 1:1 trail guide session credit work?",
    a: "Guided Expedition includes 2 credits per month. Each 1:1 consumes 1 credit (45- or 60-min, depending on the guide's listing). Unused credits expire after 30 days; you can buy additional credits a la carte on Thru-hike.",
  },
  {
    q: "Can I cancel or switch tiers?",
    a: "Yes — upgrade, downgrade, or cancel from your account at any time. Annual plans get a prorated refund window of 14 days if you haven't consumed any mentor credits.",
  },
  {
    q: "Do you offer student or cohort pricing?",
    a: "Not yet in this design pass, but the schema will support team seats (hinted at in the Guided Expedition waypoints). Email hello@aiinsider.app for beta cohort access.",
  },
];

function TierWaypointLine({ wp, accent }: { wp: TierWaypoint; accent: string; isLast: boolean }) {
  const dot = wp.included ? (
    <span
      className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full"
      style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
    />
  ) : (
    <span
      className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full border opacity-40"
      style={{ borderColor: accent }}
    />
  );
  return (
    <li className="flex gap-3 relative pb-5 last:pb-0">
      <span
        aria-hidden
        className="absolute left-[5px] top-4 w-px bottom-0 opacity-10"
        style={{ background: accent }}
      />
      {dot}
      <div className={wp.included ? "" : "opacity-40"}>
        <p className="text-sm font-medium leading-snug">{wp.label}</p>
        <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{wp.desc}</p>
      </div>
    </li>
  );
}

export default function PricingPage() {
  return (
    <main className="flex-1 px-6 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="legend-label legend-label--route block mb-3">Pricing</span>
          <h1 className="font-display text-4xl sm:text-6xl font-medium leading-[1.05] tracking-tight mb-5">
            Pick the trail that{" "}
            <span className="text-[var(--route)]">matches your pace.</span>
          </h1>
          <p className="text-[var(--text-dim)] text-lg leading-relaxed">
            From a quick afternoon hike to a fully-guided multi-month expedition — every tier
            uses the same route builder, video ranking, and progress tracker.
          </p>
          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-white/10 p-1 bg-[var(--ink-2)]/60">
            <button type="button" className="btn btn--route" style={{ padding: "6px 14px", fontSize: "12px" }}>
              Monthly
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: "6px 14px", fontSize: "12px", color: "var(--text-dim)", background: "transparent" }}
            >
              Annual
              <span className="chip chip--sage ml-1" style={{ padding: "1px 6px", fontSize: "9px" }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 items-stretch">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`surface-card p-6 sm:p-7 flex flex-col relative ${tier.cardClass ?? ""} ${
                tier.id === "thru" ? "ring-1 ring-[var(--route)]/40 lg:-my-4 lg:z-10" : ""
              }`}
            >
              {tier.badge && (
                <div
                  className="absolute -top-3 right-5 chip chip--route"
                  style={{ boxShadow: "0 6px 20px -10px var(--route)" }}
                >
                  <span className="chip__dot" />
                  {tier.badge}
                </div>
              )}

              <div className="flex items-center justify-between mb-5">
                <span className={`legend-label ${tier.legendClass}`}>{tier.tier} · {tier.name}</span>
                <span className={`chip ${tier.chipClass}`}>
                  <span className="chip__dot" />
                  {tier.name}
                </span>
              </div>

              <div className="mb-1">
                <p className="font-display text-4xl font-medium tracking-tight">
                  {tier.priceMo}
                  <span className="text-xs align-top ml-1 opacity-60 font-mono tracking-wider">/ MO</span>
                </p>
              </div>
              <p className={`text-xs mt-1 mb-6 font-mono tracking-wider ${tier.id === "guided" ? "opacity-70" : "text-[var(--text-dim)]"}`}>
                {tier.subtitle}
                {tier.priceYr ? ` · ${tier.priceYr}` : ""}
              </p>

              <ul className="mb-7">
                {tier.waypoints.map((wp, i) => (
                  <TierWaypointLine
                    key={wp.label}
                    wp={wp}
                    accent={tier.accent}
                    isLast={i === tier.waypoints.length - 1}
                  />
                ))}
              </ul>

              {tier.footerNote && (
                <p
                  className={`text-[11px] mb-5 font-mono leading-relaxed ${tier.id === "guided" ? "opacity-70" : "text-[var(--text-dim)]"}`}
                >
                  {tier.footerNote}
                </p>
              )}

              <button type="button" className={`btn ${tier.ctaClass} btn--block mt-auto`}>
                {tier.ctaLabel}
              </button>
            </article>
          ))}
        </div>

        <section className="mt-24 max-w-3xl mx-auto">
          <p className="legend-label legend-label--dim block mb-2 text-center">FAQ</p>
          <h2 className="font-display text-2xl sm:text-3xl font-medium text-center mb-10">
            Answers you&apos;d look up anyway.
          </h2>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="surface-card p-5 group">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="text-sm sm:text-base font-medium">{f.q}</span>
                  <span className="text-[var(--text-dim)] group-open:rotate-45 transition-transform font-display text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="text-sm text-[var(--text-dim)] mt-4 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-24 surface-card surface-card--paper p-8 sm:p-12 text-center">
          <p className="legend-label block mb-3" style={{ color: "var(--sage)" }}>
            Not ready to choose?
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium leading-tight mb-4">
            Map your first route for free.
          </h2>
          <p className="opacity-70 max-w-lg mx-auto mb-7 leading-relaxed text-sm sm:text-base">
            No card, no commitment. Three fresh routes every month — enough to learn
            something real and see if the trail metaphor works for how you study.
          </p>
          <Link href="/" className="btn btn--sage inline-flex" style={{ padding: "12px 20px" }}>
            Map a free route →
          </Link>
        </section>
      </div>
    </main>
  );
}
*/
