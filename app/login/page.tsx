"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import PixelBlast from "@/components/backgrounds/PixelBlast";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if we're in Electron environment
    const isElectron = typeof window !== "undefined" && window.electronAuth;

    const handleLogin = async () => {
        if (!isElectron) {
            setError("Login is only available in the desktop app");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await window.electronAuth!.login();

            if (result.success) {
                console.log("[Login] Login successful!");
                // Use window.location for a full page reload
                // This is faster because Electron main process already knows about the session
                // and will load the correct page without AuthProvider re-checking
                window.location.href = "/";
            } else {
                setError(result.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error("[Login] Error:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Draggable Header Area */}
            <div
                className="absolute top-0 left-0 right-0 h-14 z-20 app-drag"
                aria-hidden="true"
            />

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

                {/* Welcome Text */}
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                    Welcome to BaseBrain
                </h1>
                <p className="text-muted-foreground mb-8">
                    Sign in to continue to your workspace
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Login Button */}
                <Button
                    onClick={handleLogin}
                    disabled={isLoading || !isElectron}
                    size="lg"
                    className="px-8 gap-2 cursor-pointer bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Opening browser...
                        </>
                    ) : (
                        <>
                            <ExternalLink className="size-4" />
                            Log in to the App
                        </>
                    )}
                </Button>

                {/* Browser Hint */}
                <p className="mt-4 text-xs text-muted-foreground">
                    {isElectron
                        ? "This will open your browser for secure authentication"
                        : "Please open this app in the desktop application"
                    }
                </p>
            </div>
        </div>
    );
}
