'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

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

export default function Home() {
  const searchParams = useSearchParams();
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);

  const [leadTwitchChannel, setLeadTwitchChannel] = useState<string | null>(null);
  const [rightStreams, setRightStreams] = useState<string[]>(['riotgames', 'playapex', 'rocketleague']);

  const [apiData, setApiData] = useState<{players: any[], timelines: any[], completions: any[]}>({
    players: [], timelines: [], completions: []
  });

  useEffect(() => {
    const raw = searchParams.get('mappings');
    setMappings(parseMappings(raw));
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://45.93.249.181:8067/api/public/events/latest/live');
        const json = await response.json();
        if (json.status !== 'success') return;

        setApiData(json.data);

        const { players, timelines, completions } = json.data;
        const finishedUuids = new Set(completions.map((c: any) => c.uuid));

        let bestScore = -1;
        let bestTime = Infinity;
        let bestTwitchName: string | null = null;

        players.forEach((player: any) => {
          if (finishedUuids.has(player.uuid)) return;
          const mapping = mappings.find(m => m.ingameName.toLowerCase() === player.nickname.toLowerCase());
          if (!mapping) return;

          const pTimelines = timelines.filter((t: any) => t.uuid === player.uuid);
          let pMaxScore = 0;
          let pBestTime = Infinity;

          pTimelines.forEach((t: any) => {
            const config = SPLIT_CONFIG[t.type];
            if (config) {
              if (config.score > pMaxScore) {
                pMaxScore = config.score;
                pBestTime = t.time;
              } else if (config.score === pMaxScore) {
                pBestTime = Math.min(pBestTime, t.time);
              }
            }
          });

          if (pMaxScore > bestScore || (pMaxScore === bestScore && pBestTime < bestTime)) {
            bestScore = pMaxScore;
            bestTime = pBestTime;
            bestTwitchName = mapping.twitchChannel;
          }
        });

        if (bestTwitchName) setLeadTwitchChannel(bestTwitchName);
      } catch (err) { console.error(err); }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [mappings]);

  const activePlayers = useMemo(() => {
    const finishedUuids = new Set(apiData.completions.map(c => c.uuid));
    return apiData.players
        .filter(p => !finishedUuids.has(p.uuid))
        .map(p => {
          const pTimelines = apiData.timelines.filter(t => t.uuid === p.uuid);
          let maxScore = 0;
          let bestTime = Infinity;
          let currentSplitLabel = "Started";

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

  const setSidebarStream = (index: number, channel: string) => {
    const newStreams = [...rightStreams];
    newStreams[index] = channel;
    setRightStreams(newStreams);
  };

  return (
      <main className="w-screen h-screen bg-neutral-950 p-4 flex flex-col gap-4 overflow-hidden">

        <div className="grid grid-cols-3 grid-rows-3 gap-4 flex-grow h-full">
          {/* Haupt-Stream */}
          <div className="col-span-2 row-span-2 bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-2xl">
            {leadTwitchChannel ? (
                <TwitchEmbed channel={leadTwitchChannel} />
            ) : (
                <div className="h-full flex items-center justify-center text-neutral-500 italic">Searching for leader...</div>
            )}
          </div>

          {/* Rechte Sidebar Slots */}
          {[0, 1, 2].map((idx) => (
              <div key={idx} className={`col-start-3 row-start-${idx + 1} bg-black rounded-lg overflow-hidden border border-neutral-800`}>
                <TwitchEmbed channel={rightStreams[idx]} />
              </div>
          ))}

          {/* Live Standings (Unten Links) - Mehrspaltig */}
          <div className="col-span-2 row-start-3 bg-neutral-900/60 rounded-xl p-4 border border-neutral-800 relative flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-white text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Live Standings</h2>
              <div className="flex items-center gap-4 mr-12"> {/* Platz für Settings Button lassen */}
                <span className="text-[10px] text-neutral-500 uppercase">{activePlayers.length} Racing</span>
              </div>
            </div>

            {/* Grid Container für Spieler (2 Spalten) */}
            <div className="flex-grow overflow-y-auto custom-scrollbar grid grid-cols-4 gap-x-6 gap-y-2 pr-2">
              {activePlayers.map((player) => {
                const mapping = mappings.find(m => m.ingameName.toLowerCase() === player.nickname.toLowerCase());

                return (
                    <div key={player.uuid} className="flex items-center justify-between bg-neutral-800/30 p-2 rounded-md border border-white/5 hover:bg-neutral-800/60 transition-all h-11">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />
                        <div className="flex flex-col truncate">
                          <span className="text-white font-bold text-xs truncate leading-tight">{player.nickname}</span>
                          <span className="text-[9px] font-medium text-neutral-500 uppercase truncate">{player.currentSplitLabel}</span>
                        </div>
                      </div>

                      {mapping && (
                          <div className="flex gap-1 shrink-0">
                            {[0, 1, 2].map((slotIdx) => (
                                <button
                                    key={slotIdx}
                                    onClick={() => setSidebarStream(slotIdx, mapping.twitchChannel)}
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

            {/* Settings Button - In die Ecke der Liste geschoben */}
            <div className="absolute bottom-4 right-4">
              <Settings />
            </div>
          </div>
        </div>
      </main>
  );
}