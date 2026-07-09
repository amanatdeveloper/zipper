// ---------------------------------------------------------------------------
// All copy + data for the landing page lives here.
// Edit any value below to change what shows up on the page — no need to
// touch the components in /components/landing.
// ---------------------------------------------------------------------------

export const landingContent = {
  nav: {
    logoText: "Scalefire",
    logoSuffix: ".io",
    links: [
      { label: "Product", href: "/product" }, // Updated href
      { label: "Solutions", href: "/solution" }, // Updated href
      { label: "Pricing", href: "/pricing" }, // Updated href
      { label: "Resources", href: "#resources", hasDropdown: true },
      { label: "Log in", href: "/login" },
    ],
    cta: { label: "Start free trial", href: "/register" },
  },

  hero: {
    headline: [
      { text: "More profit.", accent: false },
      { text: "Less guesswork.", accent: false },
      { text: "Scale with AI.", accent: true },
    ],
    subtext:
      "Scalefire analyzes your sales, ad spend, traffic and conversion data, then automatically optimizes prices and ad bids to grow your sales and profits.",
    primaryCta: { label: "Start free trial", href: "/register" },
    secondaryCta: { label: "Sign in", href: "/login" },
    reassurance: ["No credit card required", "Setup in 5 minutes"],
    dashboardPreview: {
      title: "Performance overview",
      rangeLabel: "Last 7 days",
      stats: [
        { label: "Total revenue", value: "$1.24M", change: "28.6%", positive: true },
        { label: "Total profit", value: "$324K", change: "35.4%", positive: true },
        { label: "ROAS", value: "4.71x", change: "18.3%", positive: true },
        { label: "Profit per visitor", value: "$3.12", change: "22.1%", positive: true },
      ],
      chart: {
        seriesA: { label: "Revenue", color: "#2563EB" },
        seriesB: { label: "Profit", color: "#FB6514" },
        points: [
          { x: "May 10", revenue: 1010, profit: 300 },
          { x: "May 11", revenue: 1120, profit: 340 },
          { x: "May 12", revenue: 1060, profit: 310 },
          { x: "May 13", revenue: 1180, profit: 360 },
          { x: "May 14", revenue: 1230, profit: 380 },
          { x: "May 15", revenue: 1350, profit: 400 },
          { x: "May 16", revenue: 1500, profit: 450 },
        ],
      },
      recommendationsLabel: "Top recommendations",
      recommendationsCta: "View all",
      recommendations: [
        {
          name: "Apex Runner",
          action: "Increase price",
          impact: "+$18,742 Profit",
          confidence: 92,
          actionLabel: "Apply",
        },
        {
          name: "Hydrate Bottle",
          action: "Increase ad bid",
          impact: "+$9,385 Profit",
          confidence: 88,
          actionLabel: "Apply",
        },
        {
          name: "Whey Protein",
          action: "Decrease price",
          impact: "+$6,215 Profit",
          confidence: 79,
          actionLabel: "Apply",
        },
      ],
    },
  },

  trustedBy: {
    label: "Trusted by 2,000+ ecommerce brands",
    logos: ["True Classic", "Velo", "MVMT", "Alpine", "Tushy", "Javy"],
  },

  features: {
    eyebrow: "AI-powered optimization",
    title: "Turning data into higher profits",
    subtitle:
      "Scalefire continuously analyzes your entire funnel and makes thousands of intelligent pricing and bidding decisions so you can grow faster.",
    items: [
      {
        icon: "bar-chart",
        title: "Analyze everything",
        description:
          "We pull in sales, ad spend, traffic, conversion and product margin data from all your channels.",
      },
      {
        icon: "sparkles",
        title: "Find what moves the needle",
        description:
          "Our AI identifies the highest impact opportunities across pricing, ads and products.",
      },
      {
        icon: "bolt",
        title: "Optimize automatically",
        description:
          "Apply AI recommendations with one click or set autopilot and let Scalefire do it for you.",
      },
      {
        icon: "trend-up",
        title: "Grow profitably",
        description:
          "Drive more revenue and profit while maintaining healthy ROAS and efficient spend.",
      },
    ],
  },

  pricingBand: {
    headline: [
      { text: "Smarter pricing.", accent: false },
      { text: "Stronger ads.", accent: false },
      { text: "Bigger profits.", accent: true },
    ],
    subtext:
      "Whether you manage 50 products or 50,000, Scalefire helps you make the right decisions at the right time.",
    checklist: [
      "Real-time data & insights",
      "AI recommendations you can trust",
      "Automations that scale with you",
    ],
    inputs: ["Sales", "Ad Spend", "Traffic", "Conversions", "Costs & Margins"],
    outputs: ["Optimal Prices", "Winning Ad Bids", "Budget Allocation", "Profit Growth"],
  },

  testimonials: {
    eyebrow: "Built for ecommerce merchants",
    title: "Loved by founders and marketers",
    subtitle: "See how ecommerce brands are using Scalefire to scale smarter.",
    items: [
      {
        quote:
          "Scalefire increased our profit by 32% in the first month. The price recommendations are scary accurate.",
        name: "Nick Shackelford",
        role: "CEO, TUSHY",
        rating: 5,
      },
      {
        quote:
          "Our ROAS improvement was immediate. Scalefire finds opportunities we would have never found.",
        name: "Courtney Lee",
        role: "Growth Lead, MVMT",
        rating: 5,
      },
      {
        quote:
          "The autopilot mode is a game changer. We set it and watch our profits grow week after week.",
        name: "Ricky Hayes",
        role: "CEO, True Classic",
        rating: 5,
      },
    ],
  },

  finalCta: {
    title: "Ready to scale smarter?",
    subtitle: "Start your free trial today. No credit card required.",
    checklist: ["14-day free trial", "Full access to all features", "Cancel anytime"],
    cta: { label: "Start free trial", href: "/register" },
    card: {
      title: "Profit over time",
      change: "34.6%",
      totalProfitLabel: "Total Profit",
      totalProfitValue: "$324,540",
      totalProfitChange: "35.4%",
      roasLabel: "ROAS",
      roasValue: "4.71x",
      roasChange: "18.3%",
    },
  },

  footer: {
    logoText: "Scalefire",
    logoSuffix: ".io",
    description:
      "AI-powered optimization platform for ecommerce brands that want to grow sales and profits.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "/product" }, // Updated href
          { label: "Integrations", href: "#integrations" },
          { label: "Pricing", href: "/pricing" }, // Updated href
          { label: "Roadmap", href: "#roadmap" }
        ],
      },
      {
        title: "Solutions",
        links: [
          { label: "DTC Brands", href: "/solution" }, // Updated href
          { label: "Agencies", href: "#agencies" },
          { label: "Marketplaces", href: "#marketplaces" },
          { label: "Enterprise", href: "#enterprise" }
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Blog", href: "#blog" },
          { label: "Guides", href: "#guides" },
          { label: "Help Center", href: "#help-center" },
          { label: "Webinars", href: "#webinars" }
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About Us", href: "#about-us" },
          { label: "Careers", href: "#careers" },
          { label: "Contact", href: "#contact" }
        ],
      },
    ],
    legal: {
      copyright: `© ${new Date().getFullYear()} Scalefire.io. All rights reserved.`,
      links: [
        { label: "Privacy Policy", href: "#privacy" },
        { label: "Terms of Service", href: "#terms" }
      ],
    },
  },
};
