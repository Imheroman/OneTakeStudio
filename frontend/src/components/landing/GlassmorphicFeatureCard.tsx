"use client";

import type { ReactNode } from "react";
import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/shared/lib/utils";

interface GlassmorphicFeatureCardProps {
  index: number;
  gradient: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export function GlassmorphicFeatureCard({
  index,
  gradient,
  icon,
  title,
  description,
}: GlassmorphicFeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform({ rotateX: -y * 8, rotateY: x * 8 });
    },
    []
  );

  const onMouseLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0 });
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6",
        "transition-shadow duration-200 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
      )}
      style={{
        transform: `perspective(800px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}
