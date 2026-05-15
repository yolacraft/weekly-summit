// components/TwitchEmbed.tsx
import React from 'react';

interface TwitchEmbedProps {
    channel: string;
}

export default function TwitchEmbed({ channel }: TwitchEmbedProps) {
    const parent =
        process.env.NODE_ENV === 'development'
            ? 'localhost'
            : 'deine-domain.de';

    return (
        <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            {/* Overlay oben links */}
            <div className="absolute top-2 left-2 z-10 bg-black/60 font-extrabold text-white text-xl px-2 py-1 rounded">
                {channel}
            </div>

            <iframe
                src={`https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true`}
                height="100%"
                width="100%"
                allowFullScreen
                className="border-none"
            />
        </div>
    );
}