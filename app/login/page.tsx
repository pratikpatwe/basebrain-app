"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import PixelBlast from "@/components/backgrounds/PixelBlast";

export default function LoginPage() {
    const handleLogin = () => {
        // TODO: Implement login logic - will open browser for authentication
        console.log("Login clicked");
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <PixelBlast
                    color="#666"
                    pixelSize={4}
                    patternScale={2}
                    patternDensity={0.8}
                    speed={0.3}
                    enableRipples={true}
                    rippleSpeed={0.4}
                    rippleThickness={0.15}
                    edgeFade={0.3}
                    variant="circle"
                />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
                {/* Logo */}
                <div className="mb-8 pl-4">
                    <Image
                        src="/logo.svg"
                        alt="BaseBrain Logo"
                        width={80}
                        height={83}
                        priority
                    />
                </div>

                {/* Login Button */}
                <Button
                    onClick={handleLogin}
                    size="lg"
                    className="px-8 gap-2"
                >
                    <ExternalLink className="size-4" />
                    Login to the App
                </Button>

                {/* Browser Hint */}
                <p className="mt-4 text-xs text-muted-foreground">
                    This will open your browser for authentication
                </p>
            </div>
        </div>
    );
}
