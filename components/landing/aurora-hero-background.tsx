"use client";
import React, { useEffect, useRef } from "react";

export function AuroraHeroBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let width = (canvas.width = window.innerWidth);
		let height = (canvas.height = window.innerHeight);

		const handleResize = () => {
			if (!canvas) return;
			width = canvas.width = window.innerWidth;
			height = canvas.height = window.innerHeight;
		};

		window.addEventListener("resize", handleResize);

		// Mouse tracker
		const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

		const handleMouseMove = (e: MouseEvent) => {
			mouse.targetX = e.clientX;
			mouse.targetY = e.clientY;
		};

		window.addEventListener("mousemove", handleMouseMove);

		// Particle nodes
		interface Particle {
			x: number;
			y: number;
			vx: number;
			vy: number;
			radius: number;
			baseAlpha: number;
			pulseSpeed: number;
			color: string;
			isStar?: boolean;
		}

		const colors = [
			"rgba(52, 211, 153, ", // Mint
			"rgba(16, 185, 129, ", // Emerald
			"rgba(34, 99, 75, ", // Brand Forest Green
			"rgba(215, 237, 181, ", // Brand Lime
		];

		const particleCount = Math.min(Math.floor(width / 18), 75);
		const particles: Particle[] = [];

		for (let i = 0; i < particleCount; i++) {
			particles.push({
				x: Math.random() * width,
				y: Math.random() * height,
				vx: (Math.random() - 0.5) * 0.7,
				vy: (Math.random() - 0.5) * 0.7,
				radius: Math.random() * 2.5 + 1,
				baseAlpha: Math.random() * 0.5 + 0.2,
				pulseSpeed: Math.random() * 0.02 + 0.01,
				color: colors[Math.floor(Math.random() * colors.length)],
				isStar: Math.random() > 0.65,
			});
		}

		let time = 0;

		// Draw 4-point Stellar star spark
		const drawSpark = (c: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number, color: string) => {
			c.save();
			c.translate(cx, cy);
			c.fillStyle = `${color}${alpha})`;
			c.shadowBlur = 10;
			c.shadowColor = "rgba(52, 211, 153, 0.6)";

			c.beginPath();
			c.moveTo(0, -size * 2);
			c.quadraticCurveTo(0, 0, size * 2, 0);
			c.quadraticCurveTo(0, 0, 0, size * 2);
			c.quadraticCurveTo(0, 0, -size * 2, 0);
			c.quadraticCurveTo(0, 0, 0, -size * 2);
			c.fill();
			c.restore();
		};

		const render = () => {
			time += 0.015;

			// Smooth mouse lerp
			mouse.x += (mouse.targetX - mouse.x) * 0.05;
			mouse.y += (mouse.targetY - mouse.y) * 0.05;

			ctx.clearRect(0, 0, width, height);

			// 1. Flowing Aurora Waves
			const waveCount = 3;
			for (let w = 0; w < waveCount; w++) {
				ctx.beginPath();
				const yOffset = height * 0.35 + w * 70;
				const waveColor = w === 0 ? "rgba(16, 185, 129, 0.05)" : w === 1 ? "rgba(34, 99, 75, 0.07)" : "rgba(215, 237, 181, 0.04)";

				ctx.fillStyle = waveColor;
				ctx.moveTo(0, height);

				for (let x = 0; x <= width; x += 30) {
					const mouseInfluence = Math.sin((x - mouse.x) * 0.005) * Math.max(0, 60 - Math.abs(x - mouse.x) * 0.06);
					const y = yOffset + Math.sin(x * 0.003 + time + w * 1.5) * 45 + Math.cos(x * 0.006 - time * 0.8) * 30 + mouseInfluence;
					ctx.lineTo(x, y);
				}

				ctx.lineTo(width, height);
				ctx.closePath();
				ctx.fill();
			}

			// 2. Connect Particle Constellation
			const maxDistance = 140;
			for (let i = 0; i < particles.length; i++) {
				const p1 = particles[i];

				// Attract lightly to mouse cursor if within range
				const dxMouse = mouse.x - p1.x;
				const dyMouse = mouse.y - p1.y;
				const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
				if (distMouse < 220) {
					p1.vx += (dxMouse / distMouse) * 0.05;
					p1.vy += (dyMouse / distMouse) * 0.05;
				}

				// Move
				p1.x += p1.vx;
				p1.y += p1.vy;

				// Friction
				p1.vx *= 0.985;
				p1.vy *= 0.985;

				// Wrap around boundaries
				if (p1.x < 0) p1.x = width;
				if (p1.x > width) p1.x = 0;
				if (p1.y < 0) p1.y = height;
				if (p1.y > height) p1.y = 0;

				// Draw connections to nearby particles
				for (let j = i + 1; j < particles.length; j++) {
					const p2 = particles[j];
					const dx = p1.x - p2.x;
					const dy = p1.y - p2.y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < maxDistance) {
						const alpha = (1 - dist / maxDistance) * 0.16;
						ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
						ctx.lineWidth = 0.9;
						ctx.beginPath();
						ctx.moveTo(p1.x, p1.y);
						ctx.lineTo(p2.x, p2.y);
						ctx.stroke();
					}
				}

				// Draw particle or Star Spark
				const alpha = p1.baseAlpha + Math.sin(time * 3 + i) * 0.2;
				if (p1.isStar) {
					drawSpark(ctx, p1.x, p1.y, p1.radius * 1.5, Math.max(0.1, alpha), p1.color);
				} else {
					ctx.beginPath();
					ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
					ctx.fillStyle = `${p1.color}${Math.max(0.08, alpha)})`;
					ctx.shadowBlur = 8;
					ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
					ctx.fill();
				}
			}

			animationFrameId = requestAnimationFrame(render);
		};

		render();

		return () => {
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("mousemove", handleMouseMove);
			cancelAnimationFrame(animationFrameId);
		};
	}, []);

	return (
		<div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
			{/* Dynamic Aurora & Particle Canvas */}
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" />

			{/* Primary Radial Glow in SylarPay Forest/Emerald */}
			<div
				className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-6xl h-[650px] opacity-45 blur-[120px]"
				style={{
					background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45) 0%, rgba(34, 99, 75, 0.28) 45%, transparent 75%)",
				}}
				aria-hidden="true"
			/>

			{/* Secondary Ambient Accent in Lime */}
			<div
				className="absolute top-[250px] right-[10%] w-[450px] h-[450px] rounded-full opacity-20 blur-[130px]"
				style={{
					background: "radial-gradient(circle, rgba(215, 237, 181, 0.4) 0%, transparent 70%)",
				}}
				aria-hidden="true"
			/>

			{/* Morrow-Style Subtle Grid Lines */}
			<div className="absolute inset-0 mx-auto max-w-7xl border-r border-l border-white/[0.04]">
				{/* Scanning Laser Beam */}
				<div className="relative h-full w-full overflow-hidden">
					<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent blur-[1px] animate-[laserScan_8s_easeInOut_infinite]" aria-hidden="true" />
				</div>
			</div>

			{/* Micro dot matrix pattern */}
			<div
				className="absolute inset-0 opacity-[0.025]"
				style={{
					backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)",
					backgroundSize: "32px 32px",
				}}
				aria-hidden="true"
			/>
		</div>
	);
}
