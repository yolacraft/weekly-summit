'use client';

import React, { useState, useEffect, useRef } from 'react';

// --- TypeScript Interfaces ---
interface Player {
    id: string;
    eventId: string;
    ingameName: string;
    discordName: string;
    alias: string;
    eliminated: boolean;
}

interface ApiResponse {
    event: never;
    players: Player[];
    seeds: never[];
    leaderboard: never[];
}

export interface PlayerMapping {
    ingameName: string;
    twitchChannel: string;
}

export default function Settings() {
    const [isOpen, setIsOpen] = useState(false);

    // URL mapping (kein router nötig → stabiler)
    const lastUrlRef = useRef('');

    // API URL State
    const [apiUrl, setApiUrl] = useState(
        'http://45.93.249.181:8067/api/public/events/latest'
    );

    // Data State
    const [players, setPlayers] = useState<Player[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchStatus, setFetchStatus] =
        useState<'idle' | 'success' | 'error'>('idle');

    // Mapping State
    const [mappings, setMappings] = useState<PlayerMapping[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [twitchInput, setTwitchInput] = useState('');

    // -----------------------------
    // LOAD FROM URL (compressed)
    // -----------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('mappings');

        if (!raw) return;

        try {
            const parsed = raw
                .split(';')
                .filter(Boolean)
                .map((pair) => {
                    const [ingameName, twitchChannel] = pair.split(':');
                    return { ingameName, twitchChannel };
                });

            setMappings(parsed);
        } catch (e) {
            console.error('Failed to decode mappings', e);
        }
    }, []);

    // -----------------------------
    // SYNC TO URL (NO LOOP + NO JSON)
    // -----------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (mappings.length === 0) {
            params.delete('mappings');
        } else {
            const encoded = mappings
                .map((m) => `${m.ingameName}:${m.twitchChannel}`)
                .join(';');

            params.set('mappings', encoded);
        }

        const newUrl = `?${params.toString()}`;

        if (lastUrlRef.current === newUrl) return;
        lastUrlRef.current = newUrl;

        window.history.replaceState({}, '', newUrl);
    }, [mappings]);

    // -----------------------------
    // FETCH API
    // -----------------------------
    const handleFetch = async () => {
        setIsFetching(true);
        setFetchStatus('idle');

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Netzwerk Fehler');

            const data: ApiResponse = await response.json();
            setPlayers(data.players);

            setFetchStatus('success');
        } catch (error) {
            console.error(error);
            setFetchStatus('error');
        } finally {
            setIsFetching(false);
        }
    };

    // -----------------------------
    // ADD MAPPING
    // -----------------------------
    const handleAddMapping = () => {
        if (!selectedPlayer || !twitchInput) return;

        setMappings((prev) => [
            ...prev,
            {
                ingameName: selectedPlayer,
                twitchChannel: twitchInput,
            },
        ]);

        setSelectedPlayer('');
        setTwitchInput('');
    };

    // -----------------------------
    // REMOVE MAPPING
    // -----------------------------
    const handleRemoveMapping = (ingameName: string) => {
        setMappings((prev) =>
            prev.filter((m) => m.ingameName !== ingameName)
        );
    };

    const availablePlayers = players.filter(
        (p) => !mappings.some((m) => m.ingameName === p.ingameName)
    );

    return (
        <>
            {/* BUTTON (UNCHANGED UI) */}
            <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition-colors"
                >
                    Settings
                </button>

            {/* MODAL */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 text-white w-full max-w-2xl rounded-lg shadow-xl p-6 flex flex-col gap-6">

                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <h2 className="text-xl font-bold">
                                Dashboard Einstellungen
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        {/* API URL */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">
                                1. API URL
                            </label>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={apiUrl}
                                    onChange={(e) =>
                                        setApiUrl(e.target.value)
                                    }
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                />

                                <button
                                    onClick={handleFetch}
                                    disabled={isFetching}
                                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-4 py-2 rounded"
                                >
                                    {isFetching ? 'Lade...' : 'Fetch API'}
                                </button>
                            </div>

                            {fetchStatus === 'success' && (
                                <span className="text-green-400 text-xs">
                                    Erfolgreich geladen! {players.length}{' '}
                                    Spieler gefunden.
                                </span>
                            )}

                            {fetchStatus === 'error' && (
                                <span className="text-red-400 text-xs">
                                    Fehler beim Laden.
                                </span>
                            )}
                        </div>

                        {/* MAPPING UI (UNCHANGED) */}
                        <div className="flex flex-col gap-4 bg-gray-900/50 p-4 rounded border border-gray-700">
                            <h3 className="text-sm text-gray-400 font-medium">
                                3. Spieler zu Twitch Mapping
                            </h3>

                            <div className="flex gap-2">
                                <select
                                    value={selectedPlayer}
                                    onChange={(e) =>
                                        setSelectedPlayer(e.target.value)
                                    }
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">
                                        Spieler auswählen...
                                    </option>

                                    {availablePlayers.map((p) => (
                                        <option
                                            key={p.id}
                                            value={p.ingameName}
                                        >
                                            {p.ingameName}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Twitch Username"
                                    value={twitchInput}
                                    onChange={(e) =>
                                        setTwitchInput(e.target.value)
                                    }
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
                                />

                                <button
                                    onClick={handleAddMapping}
                                    disabled={
                                        !selectedPlayer || !twitchInput
                                    }
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-4 py-2 rounded"
                                >
                                    Add
                                </button>
                            </div>

                            {/* LIST */}
                            <div className="mt-2 flex flex-col gap-2 max-h-40 overflow-y-auto">
                                {mappings.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">
                                        Noch keine Spieler verknüpft.
                                    </p>
                                ) : (
                                    mappings.map((mapping) => (
                                        <div
                                            key={mapping.ingameName}
                                            className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700 text-sm"
                                        >
                                            <div>
                                                <span className="font-bold text-blue-400">
                                                    {mapping.ingameName}
                                                </span>
                                                <span className="text-gray-400 mx-2">
                                                    ➡️
                                                </span>
                                                <span>
                                                    twitch.tv/
                                                    {
                                                        mapping.twitchChannel
                                                    }
                                                </span>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    handleRemoveMapping(
                                                        mapping.ingameName
                                                    )
                                                }
                                                className="text-red-400 hover:text-red-300 px-2"
                                            >
                                                Löschen
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}