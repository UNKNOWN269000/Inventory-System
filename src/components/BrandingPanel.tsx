import { IconCommand, IconShield, IconUsers, IconSparkles } from "./Icons";
import logoUrl from "../logo.png";

export function BrandingPanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-black lg:block">
      {/* Aurora background */}
      <div className="absolute inset-0">
        <div
          className="aurora-blob absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,0,0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="aurora-blob-2 absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,0,0.25) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="aurora-blob-3 absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,0,0.15) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 80%, #000 100%)",
        }}
      />

      {/* Floating orbs */}
      <div className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-[#00ff00] blur-[2px] float-animation" />
      <div
        className="absolute right-[15%] top-[30%] h-1.5 w-1.5 rounded-full bg-[#00ff00] blur-[2px] float-animation"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute left-[20%] bottom-[25%] h-2 w-2 rounded-full bg-[#00ff00] blur-[2px] float-animation"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute right-[10%] bottom-[20%] h-1 w-1 rounded-full bg-[#00ff00] blur-[2px] float-animation"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
        {/* Logo */}
        <div className="flex items-center gap-3 animate-slide-up stagger-1">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00ff00] blur-md opacity-60" />
            <img
              src={logoUrl}
              alt="Ultra Aluminum Pvt Ltd logo"
              className="relative h-12 w-12 rounded-full border-2 border-[#00ff00] object-cover shadow-[0_0_30px_rgba(0,255,0,0.55)]"
            />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-white">
              Ultra Aluminum
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00ff00]">
              Pvt Ltd // est. 2010
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="animate-slide-up stagger-2 inline-flex items-center gap-2 rounded-full border border-[#00ff00]/30 bg-[#00ff00]/5 px-3 py-1.5 text-xs font-medium text-[#00ff00] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff00] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff00]" />
            </span>
            ISO 9001 Certified
          </div>

          <div className="space-y-5">
            <h1 className="animate-slide-up stagger-3 text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
              Precision-engineered
              <br />
              <span className="relative inline-block">
                <span className="shimmer-text">aluminum solutions</span>
              </span>
            </h1>

            <p className="animate-slide-up stagger-4 max-w-md text-base leading-relaxed text-white/60">
              From architectural extrusions to custom fabricated profiles,
              Ultra Aluminum delivers strength, finish, and consistency trusted
              by builders and industries across the nation.
            </p>
          </div>

          {/* Stats */}
          <div className="animate-slide-up stagger-5 grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">15+</div>
              <div className="text-xs text-white/50">Years</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#00ff00]">500+</div>
              <div className="text-xs text-white/50">Projects</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">50+</div>
              <div className="text-xs text-white/50">Clients</div>
            </div>
          </div>

          {/* Features row */}
          <div className="animate-slide-up stagger-6 flex flex-wrap gap-2 pt-2">
            <FeatureChip icon={<IconShield className="h-3.5 w-3.5" />} label="ISO Certified" />
            <FeatureChip icon={<IconCommand className="h-3.5 w-3.5" />} label="Custom Profiles" />
            <FeatureChip icon={<IconUsers className="h-3.5 w-3.5" />} label="Bulk Orders" />
            <FeatureChip icon={<IconSparkles className="h-3.5 w-3.5" />} label="Premium Finish" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/40 animate-slide-up stagger-6">
          <div className="flex items-center gap-2 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff00]" />
            <span>All systems operational</span>
          </div>
          <div className="font-mono">© 2026 Ultra Aluminum Pvt Ltd</div>
        </div>
      </div>

      {/* Decorative rotating ring */}
      <div className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 opacity-30">
        <div className="relative h-72 w-72 animate-spin-slow">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#00ff00]/40" />
          <div className="absolute inset-4 rounded-full border border-dotted border-[#00ff00]/30" />
          <div className="absolute inset-8 rounded-full border border-dashed border-[#00ff00]/20" />
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#00ff00] shadow-[0_0_20px_#00ff00]" />
          <div className="absolute bottom-8 right-4 h-1.5 w-1.5 rounded-full bg-[#00ff00] shadow-[0_0_15px_#00ff00]" />
          <div className="absolute left-4 top-1/3 h-1 w-1 rounded-full bg-[#00ff00] shadow-[0_0_10px_#00ff00]" />
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm transition hover:border-[#00ff00]/40 hover:text-[#00ff00]">
      {icon}
      <span>{label}</span>
    </div>
  );
}
