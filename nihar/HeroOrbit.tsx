import OrbitNode from "./OrbitNode";
import { Lightbulb, Shield, Check } from "lucide-react";

const HeroOrbit = () => {
  return (
    <div className="relative w-full max-w-[980px] h-[260px] mx-auto mb-2.5">
      {/* Connector wires SVG */}
      <svg
        className="absolute inset-0 pointer-events-none opacity-55"
        viewBox="0 0 980 260"
        preserveAspectRatio="none"
        style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,.10))" }}
      >
        {/* Left side wires */}
        <line className="stroke-zinc-300" strokeWidth="1.5" x1="210" y1="70" x2="420" y2="130" />
        <circle className="fill-[#3399FF] opacity-95" cx="210" cy="70" r="4" />
        <circle className="fill-accent opacity-95" cx="420" cy="130" r="4" />

        <line className="stroke-zinc-300" strokeWidth="1.5" x1="265" y1="190" x2="420" y2="140" />
        <circle className="fill-[#3399FF] opacity-95" cx="265" cy="190" r="4" />

        {/* Right side wires */}
        <line className="stroke-zinc-300" strokeWidth="1.5" x1="770" y1="80" x2="560" y2="132" />
        <circle className="fill-[#3399FF] opacity-95" cx="770" cy="80" r="4" />
        <circle className="fill-[#3399FF] opacity-95" cx="560" cy="132" r="4" />

        <line className="stroke-zinc-300" strokeWidth="1.5" x1="720" y1="195" x2="560" y2="145" />
        <circle className="fill-[#3399FF] opacity-95" cx="720" cy="195" r="4" />

        {/* Center baseline */}
        <line className="stroke-zinc-300" strokeWidth="1.5" x1="150" y1="135" x2="830" y2="135" />
      </svg>

      {/* Left avatar */}
      <OrbitNode
        className="!w-[86px] !h-[86px] !rounded-lg"
        style={{ left: 0, top: 92 }}
        delay={3}
      >
        <img
          alt="avatar"
          src="https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=240&q=70"
          className="w-full h-full object-cover saturate-[1.02]"
        />
      </OrbitNode>

      {/* Yellow lightbulb node */}
      <OrbitNode
        variant="yellow"
        className="!w-[70px] !h-[70px] !rounded-[20px]"
        style={{ left: 185, top: 32 }}
        delay={1}
      >
        <Lightbulb className="w-[34px] h-[34px] text-foreground opacity-95" strokeWidth={1.8} />
      </OrbitNode>

      {/* Blue balloons node */}
      <OrbitNode
        variant="blue"
        className="!w-[70px] !h-[70px] !rounded-[20px]"
        style={{ left: 250, top: 145 }}
        delay={2}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-[34px] h-[34px]">
          <path d="M8 14c-2.2 0-4-2.2-4-5s1.8-5 4-5 4 2.2 4 5-1.8 5-4 5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 14c-2.2 0-4-2.2-4-5s1.8-5 4-5 4 2.2 4 5-1.8 5-4 5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 14v7M16 14v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </OrbitNode>

      {/* Center purple node */}
      <OrbitNode
        variant="center"
        className="!w-[110px] !h-[110px] !rounded-[30px] animate-float-slow"
        style={{ left: "50%", top: 75, transform: "translateX(-50%)" }}
        delay={0}
      >
        <Check className="w-[40px] h-[40px] text-white/90" strokeWidth={2.2} />
      </OrbitNode>

      {/* Red shield node */}
      <OrbitNode
        variant="red"
        className="!w-[70px] !h-[70px] !rounded-[20px]"
        style={{ right: 170, top: 40 }}
        delay={4}
      >
        <Shield className="w-[34px] h-[34px] text-white/90" strokeWidth={1.8} />
      </OrbitNode>

      {/* Right eyes node */}
      <OrbitNode
        className="!w-[86px] !h-[86px] !rounded-lg"
        style={{ right: 0, top: 92 }}
        delay={2}
      >
        <div className="w-full h-full grid place-items-center bg-white">
          <svg width="56" height="26" viewBox="0 0 56 26" fill="none">
            <ellipse cx="18" cy="13" rx="10" ry="11" stroke="currentColor" strokeWidth="2" />
            <ellipse cx="38" cy="13" rx="10" ry="11" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="13" r="3.5" fill="currentColor" />
            <circle cx="38" cy="13" r="3.5" fill="currentColor" />
          </svg>
        </div>
      </OrbitNode>

      {/* Bottom right avatar */}
      <OrbitNode
        className="!w-[72px] !h-[72px] !rounded-[22px]"
        style={{ right: 260, top: 165 }}
        delay={3}
      >
        <img
          alt="avatar"
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=70"
          className="w-full h-full object-cover saturate-[1.02]"
        />
      </OrbitNode>
    </div>
  );
};

export default HeroOrbit;
