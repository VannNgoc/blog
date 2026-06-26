"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

interface ParticlesProps {
  className?: string;
  quantity?: number;
  color?: string;
  size?: number;
  staticity?: number;
  ease?: number;
  refresh?: boolean;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

export function Particles({
  className,
  quantity = 100,
  color = "#ffffff",
  size = 0.4,
  staticity = 50,
  ease = 50,
  refresh = false,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const circles = useRef<Circle[]>([]);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rgb = hexToRgb(color);

    const initCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const makeCircle = (): Circle => {
      const { width, height } = container.getBoundingClientRect();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        translateX: 0,
        translateY: 0,
        size: Math.random() * 2 + size,
        alpha: 0,
        targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
        dx: (Math.random() - 0.5) * 0.2,
        dy: (Math.random() - 0.5) * 0.2,
        magnetism: 0.1 + Math.random() * 4,
      };
    };

    const drawCircle = (c: Circle) => {
      ctx.translate(c.translateX, c.translateY);
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${c.alpha})`;
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const animate = () => {
      const { width, height } = container.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      circles.current = circles.current.filter((c) => {
        const ox = c.x + c.translateX;
        const oy = c.y + c.translateY;
        if (ox < -c.size || ox > width + c.size || oy < -c.size || oy > height + c.size) {
          return false;
        }
        if (c.alpha < c.targetAlpha) c.alpha = Math.min(c.alpha + 0.02, c.targetAlpha);
        c.x += c.dx;
        c.y += c.dy;
        c.translateX += (mouse.current.x / (staticity / c.magnetism) - c.translateX) / ease;
        c.translateY += (mouse.current.y / (staticity / c.magnetism) - c.translateY) / ease;
        drawCircle(c);
        return true;
      });

      while (circles.current.length < quantity) {
        circles.current.push(makeCircle());
      }

      rafId.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      const { left, top } = container.getBoundingClientRect();
      mouse.current = { x: e.clientX - left, y: e.clientY - top };
    };

    initCanvas();
    for (let i = 0; i < quantity; i++) circles.current.push(makeCircle());
    animate();

    window.addEventListener("resize", initCanvas);
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", initCanvas);
      container.removeEventListener("mousemove", onMouseMove);
    };
  }, [color, quantity, size, staticity, ease, refresh]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0", className)}>
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
