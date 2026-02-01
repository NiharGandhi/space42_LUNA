import { motion } from "framer-motion";
import { ReactNode } from "react";

interface OrbitNodeProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  variant?: "default" | "center" | "yellow" | "red" | "blue";
}

const variantStyles = {
  default: "bg-white border border-zinc-200 shadow-lg",
  center: "bg-[image:var(--gradient-purple)] border border-white/20 shadow-xl",
  yellow: "bg-[image:var(--gradient-yellow)]",
  red: "bg-[image:var(--gradient-red)]",
  blue: "bg-[image:var(--gradient-blue)]",
};

const OrbitNode = ({ children, className = "", style, delay = 0, variant = "default" }: OrbitNodeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.5 }}
      className={`absolute w-[78px] h-[78px] rounded-[22px] grid place-items-center overflow-hidden animate-float ${variantStyles[variant]} ${className}`}
      style={{ animationDelay: `${delay * -0.3}s`, ...style }}
    >
      {children}
    </motion.div>
  );
};

export default OrbitNode;
