'use client';

import { useEffect, useState, useMemo } from 'react';
import TwitchEmbed from '@/components/TwitchEmbed';
import Settings from '@/components/Settings';

// --- Types & Constants ---
export interface PlayerMapping {
    ingameName: string;
    twitchChannel: string;
}

const SPLIT_CONFIG: Record<string, { label: string; score: number }> = {
    "story.enter_the_end": { label: "Entered The End", score: 6 },
    "story.follow_ender_eye": { label: "Found Stronghold", score: 5 },
    "projectelo.timeline.blind_travel": { label: "Finding Stronghold", score: 4 },
    "nether.find_fortress": { label: "Found Fortress", score: 3 },
    "nether.find_bastion": { label: "Found Bastion", score: 2 },
    "story.enter_the_nether": { label: "Entered Nether", score: 1 },
};

function parseMappings(raw: string | null): PlayerMapping[] {
    if (!raw) return [];
    return raw.split(';').filter(Boolean).map((pair) => {
        const [ingameName, twitchChannel] = pair.split(':');
        return { ingameName, twitchChannel };
    });
}

export default function HomeClient({
                                       mappings,
                                   }: {
    mappings: string | null;
}) {
    const [parsedMappings, setParsedMappings] = useState<PlayerMapping[]>([]);
    const [leadTwitchChannel, setLeadTwitchChannel] = useState<string | null>(null);

    // Wir behalten 3 Slots, aber Index 0 wird automatisch belegt
    const [rightStreams, setRightStreams] = useState<string[]>([
        'empty',
        'empty',
        'empty',
    ]);

    const [apiData, setApiData] = useState<{
        players: any[];
        timelines: any[];
        completions: any[];
    }>({
        players: [],
        timelines: [],
        completions: [],
    });

    useEffect(() => {
        setParsedMappings(parseMappings(mappings));
    }, [mappings]);

    // Fetch Loop (nur Daten holen)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://45.93.249.181:8067/api/public/events/latest/live');
                const json = await response.json();
                if (json.status !== 'success') return;
                setApiData(json.data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    // Ranking berechnen
    const activePlayers = useMemo(() => {
        const finishedUuids = new Set(apiData.completions.map(c => c.uuid));

        return apiData.players
            .filter(p => !finishedUuids.has(p.uuid))
            .map(p => {
                const pTimelines = apiData.timelines.filter(t => t.uuid === p.uuid);
                let maxScore = 0;
                let bestTime = Infinity;
                let currentSplitLabel = 'Started';

                pTimelines.forEach(t => {
                    const config = SPLIT_CONFIG[t.type];
                    if (config) {
                        if (config.score > maxScore) {
                            maxScore = config.score;
                            bestTime = t.time;
                            currentSplitLabel = config.label;
                        } else if (config.score === maxScore && maxScore > 0) {
                            bestTime = Math.min(bestTime, t.time);
                        }
                    }
                });

                return { ...p, maxScore, bestTime, currentSplitLabel };
            })
            .sort((a, b) => {
                if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
                return a.bestTime - b.bestTime;
            });
    }, [apiData]);

    // Automatische Zuweisung für Platz 1 und Platz 2
    useEffect(() => {
        if (activePlayers.length > 0) {
            // Platz 1 -> Main Stream
            const p1 = activePlayers[0];
            const m1 = parsedMappings.find(m => m.ingameName.toLowerCase() === p1.nickname.toLowerCase());
            if (m1) setLeadTwitchChannel(m1.twitchChannel);

            // Platz 2 -> Erster Sidebar Slot (Index 0)
            const p2 = activePlayers[1];
            const m2 = p2 ? parsedMappings.find(m => m.ingameName.toLowerCase() === p2.nickname.toLowerCase()) : null;

            setRightStreams(prev => {
                const newState = [...prev];
                newState[0] = m2 ? m2.twitchChannel : 'empty';
                return newState;
            });
        }
    }, [activePlayers, parsedMappings]);

    const setManualSidebarStream = (index: number, channel: string) => {
        const newStreams = [...rightStreams];
        newStreams[index] = channel; // index wird hier 1 oder 2 sein
        setRightStreams(newStreams);
    };

    return (
        <main className="w-screen h-screen bg-neutral-950 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="grid grid-cols-3 grid-rows-3 gap-4 flex-grow h-full">

                {/* Main Stream (Platz 1) */}
                <div className="col-span-2 row-span-2 bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-2xl">
                    {leadTwitchChannel ? (
                        <TwitchEmbed channel={leadTwitchChannel} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-500 italic">
                            Searching for leader...
                        </div>
                    )}
                </div>

                {/* Sidebar Streams (Slot 1 ist Auto-Platz 2, Slot 2 & 3 sind manuell) */}
                {[0, 1, 2].map(idx => (
                    <div
                        key={idx}
                        className={`col-start-3 row-start-${idx + 1} bg-black rounded-lg overflow-hidden border border-neutral-800 relative`}
                    >
                        {idx === 0 && (
                            <div className="absolute top-2 left-2 z-10 bg-purple-600 text-white text-[8px] px-1 rounded font-bold uppercase">
                                Auto: 2nd Place
                            </div>
                        )}
                        <TwitchEmbed channel={rightStreams[idx]} />
                    </div>
                ))}

                {/* Standings */}
                <div className="col-span-2 row-start-3 bg-neutral-900/60 rounded-xl p-4 border border-neutral-800 relative flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">
                            Live Standings
                        </h2>
                        <span className="text-[10px] text-neutral-500 uppercase mr-12">
                            {activePlayers.length} Racing
                        </span>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar grid grid-cols-4 gap-x-6 gap-y-2 pr-2">
                        {activePlayers.map(player => {
                            const mapping = parsedMappings.find(
                                m => m.ingameName.toLowerCase() === player.nickname.toLowerCase()
                            );

                            return (
                                <div
                                    key={player.uuid}
                                    className="flex items-center justify-between bg-neutral-800/30 p-2 rounded-md border border-white/5 hover:bg-neutral-800/60 transition-all h-11"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />
                                        <div className="flex flex-col truncate">
                                            <span className="text-white font-bold text-xs truncate">
                                                {player.nickname}
                                            </span>
                                            <span className="text-[9px] text-neutral-500 uppercase truncate">
                                                {player.currentSplitLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {mapping && (
                                        <div className="flex gap-1 shrink-0">
                                            {/* Nur Buttons für Slot 2 und 3 (Indices 1 und 2) */}
                                            {[1, 2].map(slotIdx => (
                                                <button
                                                    key={slotIdx}
                                                    onClick={() => setManualSidebarStream(slotIdx, mapping.twitchChannel)}
                                                    className="w-6 h-6 flex items-center justify-center bg-neutral-950 border border-neutral-700 hover:bg-purple-600 hover:border-purple-400 text-white text-[10px] font-bold rounded transition-all"
                                                >
                                                    {slotIdx + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="absolute bottom-4 right-4">
                        <Settings />
                    </div>
                </div>
            </div>
        </main>
    );
}