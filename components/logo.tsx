import React from "react";

interface LogoProps {
	size?: "sm" | "md" | "lg" | "xl";
	showWordmark?: boolean;
	className?: string;
	badge?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "", badge }: LogoProps) {
	const iconSizes = {
		sm: "w-6 h-6",
		md: "w-8 h-8",
		lg: "w-10 h-10",
		xl: "w-12 h-12",
	};

	const textSizes = {
		sm: "text-base",
		md: "text-lg",
		lg: "text-xl",
		xl: "text-2xl",
	};

	return (
		<div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
			{/* Icon */}
			<div className={`relative ${iconSizes[size]} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
				{/* Ambient glow behind logo */}
				<div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-600/40 via-emerald-400/30 to-[#22634b]/40 blur-md opacity-75 group-hover:opacity-100 transition-opacity" aria-hidden="true" />

				<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative w-full h-full drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
					<defs>
						{/* Main brand gradient */}
						<linearGradient id="sylarGradPrimary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
							<stop offset="0%" stopColor="#34d399" />
							<stop offset="50%" stopColor="#10b981" />
							<stop offset="100%" stopColor="#22634b" />
						</linearGradient>

						<linearGradient id="sylarGradAccent" x1="40" y1="8" x2="8" y2="40" gradientUnits="userSpaceOnUse">
							<stop offset="0%" stopColor="#d7edb5" />
							<stop offset="60%" stopColor="#34d399" />
							<stop offset="100%" stopColor="#10b981" />
						</linearGradient>

						{/* Subtle inner dark gradient for depth */}
						<radialGradient id="sylarCoreGlow" cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
							<stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
							<stop offset="100%" stopColor="#22634b" stopOpacity="0" />
						</radialGradient>
					</defs>

					{/* Rounded Squircle Container */}
					<rect x="3" y="3" width="42" height="42" rx="12" fill="#060c08" stroke="url(#sylarGradPrimary)" strokeWidth="1.5" strokeOpacity="0.6" />

					{/* Subtle inner glow circle */}
					<circle cx="24" cy="24" r="16" fill="url(#sylarCoreGlow)" />

					{/* Upper loop of the S - sleek continuous ribbon */}
					<path
						d="M32 15.5C32 12.4624 29.5376 10 26.5 10H20C15.5817 10 12 13.5817 12 18C12 21.866 14.7355 25.0931 18.3976 25.8255L28.5 27.5C31.5376 27.9556 34 30.5673 34 33.75C34 37.1466 31.0899 40 27.5 40H19C15.6863 40 13 37.3137 13 34"
						stroke="url(#sylarGradPrimary)"
						strokeWidth="3.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>

					{/* Lower loop highlight overlay */}
					<path d="M17 25.5L27 27.2C30.3137 27.7634 33 30.5366 33 33.9C33 37.2688 30.3137 40 27 40H20" stroke="url(#sylarGradAccent)" strokeWidth="3.5" strokeLinecap="round" />

					{/* Stellar Star / Settlement Spark at top right */}
					<path d="M33 11L34.1 13.9L37 15L34.1 16.1L33 19L31.9 16.1L29 15L31.9 13.9L33 11Z" fill="#d7edb5" className="animate-pulse" />

					{/* Subtle center orbital node */}
					<circle cx="24" cy="24" r="2" fill="#d7edb5" />
				</svg>
			</div>

			{/* Wordmark */}
			{showWordmark && (
				<div className="flex items-center gap-2">
					<span className={`font-semibold tracking-tight text-white ${textSizes[size]}`}>
						Sylar
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#d7edb5] font-bold">Pay</span>
					</span>

					{badge && <span className="text-[10px] font-sans uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">{badge}</span>}
				</div>
			)}
		</div>
	);
}
