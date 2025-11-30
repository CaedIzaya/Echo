import React, { useEffect, useRef } from 'react';

interface WelcomeScreenProps {
  onBegin?: () => void;
  onSignIn?: () => void;
}

const PARTICLE_COUNT_DESKTOP = 120;
const PARTICLE_COUNT_MOBILE = 60;

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  life: number;
  captured: boolean;
  captureProgress: number;
}

const createParticle = (width: number, height: number): Particle => {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.8 + 0.8,
    speed: Math.random() * 0.4 + 0.2,
    sway: Math.random() * 0.6 - 0.3,
    swaySpeed: Math.random() * 0.003 + 0.001,
    life: Math.random(),
    captured: false,
    captureProgress: 0,
  };
};

const updateParticle = (
  particle: Particle,
  width: number,
  height: number,
  dt: number,
  centerX: number,
  centerY: number,
  captureRadius: number
) => {
  if (particle.captured) {
    particle.captureProgress = Math.min(1, particle.captureProgress + dt * 0.00035);
    const angle = particle.life * Math.PI * 4 + particle.captureProgress * Math.PI * 2;
    const radius = captureRadius * (0.3 + 0.7 * particle.captureProgress);
    particle.x = centerX + Math.cos(angle) * radius * 0.6;
    particle.y = centerY + Math.sin(angle) * radius * 0.4;
    particle.size = Math.max(0.4, particle.size * (1 - particle.captureProgress * 0.8));
    return particle;
  }

  particle.life += dt * particle.swaySpeed;
  particle.x += Math.sin(particle.life * Math.PI * 2) * particle.sway;
  particle.y += particle.speed * dt * 0.06;

  const dx = particle.x - centerX;
  const dy = particle.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < captureRadius && Math.random() > 0.92) {
    particle.captured = true;
  }

  if (particle.y > height + 10 || particle.x < -20 || particle.x > width + 20) {
    const reset = createParticle(width, height);
    particle.x = reset.x;
    particle.y = -10;
    particle.size = reset.size;
    particle.speed = reset.speed;
    particle.sway = reset.sway;
    particle.swaySpeed = reset.swaySpeed;
    particle.life = reset.life;
    particle.captured = false;
    particle.captureProgress = 0;
  }

  return particle;
};

const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
  const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 4);
  gradient.addColorStop(0, 'rgba(76, 231, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(76, 231, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(76, 231, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * (particle.captured ? 6 : 3), 0, Math.PI * 2);
  ctx.fill();
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onBegin, onSignIn }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * window.devicePixelRatio;
      canvas.height = innerHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      particlesRef.current = Array.from({ length: particleCount }).map(() => createParticle(innerWidth, innerHeight));
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const now = Date.now();
      const dt = Math.min(64, now - lastTimeRef.current);
      lastTimeRef.current = now;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height * 0.4;
      const captureRadius = Math.min(width, height) * 0.16;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current = particlesRef.current.map((particle) => {
        const updated = updateParticle(particle, width, height, dt, centerX, centerY, captureRadius);
        drawParticle(ctx, updated);
        return updated;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0b1a33] via-[#111b38] to-[#17102b] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,172,254,0.2),transparent_60%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 pt-6 sm:px-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-emerald-200/80 backdrop-blur">
            数字静默
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-12">
          <div className="relative mb-12 flex flex-col items-center justify-center">
            <div className="flower-container">
              <div className="petal petal-1" />
              <div className="petal petal-2" />
              <div className="petal petal-3" />
              <div className="petal petal-4" />
              <div className="flower-core" />
              <div className="flower-glow" />
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-wide text-emerald-100 sm:text-4xl md:text-5xl leading-tight">
                <span className="block">不为清单增加任务</span>
                <span className="block">只为热爱投入时间</span>
              </h1>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-blue-100/80 sm:text-lg">
                <span className="block">你拥有夺回注意力与意识主权的力量。</span>
                <span className="block">成长来自光，也来自你敢看见自己的影。</span>
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <button
                onClick={onBegin}
                className="pointer-events-auto w-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-10 py-3 text-base font-semibold text-slate-900 shadow-[0_15px_45px_-25px_rgba(45,202,193,1)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-30px_rgba(45,202,193,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 sm:w-auto"
              >
                开始投资
              </button>
              <button
                onClick={onSignIn}
                className="pointer-events-auto w-full rounded-full border border-emerald-200/60 bg-white/5 px-10 py-3 text-base font-semibold text-emerald-100 transition-all hover:border-emerald-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 sm:w-auto"
              >
                我已准备好
              </button>
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-center px-6 pb-10 text-sm text-emerald-100/70">
          <div className="flex items-center gap-4">
            <span>• 专注计时</span>
            <span>• 真我计划</span>
            <span>• 心流成长</span>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .flower-container {
          position: relative;
          width: min(22rem, 60vw);
          height: min(22rem, 60vw);
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 40px rgba(45, 202, 193, 0.25));
        }

        .flower-glow {
          position: absolute;
          inset: 15%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(129,236,236,0.4) 0%, rgba(45,202,193,0) 70%);
          animation: glow 6s ease-in-out infinite;
        }

        .flower-core {
          position: absolute;
          width: 28%;
          height: 28%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(129,236,236,0.4) 35%, rgba(45,202,193,0) 70%);
          box-shadow: 0 0 35px rgba(129,236,236,0.5);
          animation: corePulse 5s ease-in-out infinite;
        }

        .petal {
          position: absolute;
          inset: 12%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45,202,193,0.75) 0%, rgba(45,202,193,0.05) 70%);
          opacity: 0.75;
          mix-blend-mode: screen;
          animation: petalBloom 10s ease-in-out infinite;
        }

        .petal-1 {
          transform: rotate(0deg);
        }

        .petal-2 {
          transform: rotate(45deg);
          animation-delay: 1.2s;
        }

        .petal-3 {
          transform: rotate(90deg);
          animation-delay: 2.4s;
        }

        .petal-4 {
          transform: rotate(135deg);
          animation-delay: 3.6s;
        }

        @keyframes petalBloom {
          0% {
            transform: scale(0.8) rotate(var(--tw-rotate));
            opacity: 0.2;
          }
          30% {
            transform: scale(1.05) rotate(var(--tw-rotate));
            opacity: 0.75;
          }
          60% {
            transform: scale(1) rotate(calc(var(--tw-rotate) + 3deg));
            opacity: 0.9;
          }
          100% {
            transform: scale(0.85) rotate(calc(var(--tw-rotate) + 8deg));
            opacity: 0.2;
          }
        }

        @keyframes corePulse {
          0%, 100% {
            transform: scale(0.95);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @media (max-width: 640px) {
          .flower-container {
            width: min(15rem, 70vw);
            height: min(15rem, 70vw);
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
