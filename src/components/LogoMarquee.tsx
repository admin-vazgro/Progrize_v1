const COMPANIES = [
  "Google", "Notion", "Amazon", "Figma", "Stripe",
  "Airbnb", "Linear", "Vercel", "Spotify", "Anthropic",
  "Microsoft", "OpenAI", "Salesforce", "Atlassian", "Shopify",
];

function Logo({ name }: { name: string }) {
  return (
    <span className="shrink-0 text-[15px] font-medium tracking-[-0.02em] text-[#c8c5bc] px-6">
      {name}
    </span>
  );
}

export function LogoMarquee() {
  return (
    <section className="bg-[#fafaf8] border-b border-[#eceae3] py-8 overflow-hidden" aria-label="Trusted companies">
      <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[#a8a59e] mb-6">
        Trusted by job seekers targeting
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#fafaf8] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#fafaf8] to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...COMPANIES, ...COMPANIES].map((name, i) => (
            <Logo key={i} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
