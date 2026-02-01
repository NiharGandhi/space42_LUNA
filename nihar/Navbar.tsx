'use client';

import { motion } from "framer-motion";
import Link from "next/link";

const navItems = [
  { label: "Product", id: "product" },
  { label: "Features", id: "features" },
  { label: "Careers", id: "careers" },
];

const Navbar = () => {
  const scrollTo = (id: string) => {
    const el = document.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg py-1.5 transition-opacity hover:opacity-90">
          <img src="/logo.svg" alt="Space42" className="h-7 w-auto" />
          <span className="text-base font-semibold tracking-tight text-zinc-900">Space42</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}
              onClick={() => scrollTo(item.id)}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Sign in
            </motion.span>
          </Link>
          <Link href="/career">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block rounded-full bg-[#0066FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[#0052CC] hover:shadow-xl"
            >
              View Careers
            </motion.span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
