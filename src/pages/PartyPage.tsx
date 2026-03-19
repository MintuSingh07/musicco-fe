import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/musicco_logo.svg';
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
import { BsTablet } from "react-icons/bs";
import laptopIcon from '../assets/laptop.svg';
import memberLaptopIcon from '../assets/laptop-2.png';
import './PartyPage.css';
import { socket } from '../socket';

interface Member {
    id: string;
    device_type: 'Mobile' | 'Tablet' | 'Laptop';
    device_name: string;
    icon?: string; // Optional since we'll map inside the component or keep from server if sent
}

const PartyPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [songsQueue, setSongsQueue] = useState<any[]>([]);
    const [currentSong, setCurrentSong] = useState<any | null>(null);
    const [adminId, setAdminId] = useState<string>('');
    const [mode, setMode] = useState<'traverse' | 'boom'>('boom');
    const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [isMusicPlayerInterface, setIsMusicPlayerInterface] = useState<boolean>(true);

    // Playback State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    // Stores the server playback snapshot received on join, applied once audio loads
    const pendingPlaybackRef = useRef<any>(null);
    const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
    const [clockOffset, setClockOffset] = useState<number>(0);

    // Lifted to component scope so onLoadedMetadata can also call it
    const handleSyncPlayback = useCallback((playback: any) => {
        const audio = audioRef.current;

        if (!audio || !audio.src) {
            pendingPlaybackRef.current = playback;
            return;
        }

        const { isPlaying: serverIsPlaying, currentTime, startAt } = playback;

        const now = Date.now();
        const delay = startAt ? startAt - now : 0;

        let targetTime = currentTime;

        if (delay < 0) {
            targetTime = currentTime + Math.abs(delay) / 1000;
        }

        // ✅ only seek if needed
        if (Math.abs(audio.currentTime - targetTime) > 0.5) {
            audio.currentTime = targetTime;
        }

        if (serverIsPlaying) {
            setTimeout(() => {
                if (audio.paused) {
                    audio.play()
                        .then(() => {
                            setIsPlaying(true);
                            setIsAutoplayBlocked(false);
                        })
                        .catch(() => {
                            setIsAutoplayBlocked(true);
                        });
                }
            }, Math.max(0, delay));
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    }, []);

    useEffect(() => {
        if (!id) return;

        //? Join room on mount (handles direct links)
        socket.emit('join-room', { roomId: id });

        //? Listen for initial room data and join success
        socket.on("success:join-room", ({ roomId, members: initialMembers, admin: currentAdminId, songsQueue: initialQueue, currentSong: initialSong, playback: initialPlayback }) => {
            if (roomId === id) {
                setAdminId(currentAdminId);
                const formattedMembers: Member[] = initialMembers.map((m: any) => ({
                    ...m
                }));
                setMembers(formattedMembers);
                setSongsQueue(initialQueue || []);
                setCurrentSong(initialSong || null);

                // Store playback state — will be applied in onLoadedMetadata once audio is ready
                if (initialPlayback) {
                    pendingPlaybackRef.current = initialPlayback;
                }
            }
        });

        //? Listen for playback status updates
        socket.on("playback-status", (playback) => {
            handleSyncPlayback(playback);
        });

        //? Listen for continuous sync from server for drift correction
        socket.on("sync", ({ position }) => {
            const audio = audioRef.current;
            if (!audio || !isPlaying) return;

            const diff = position - audio.currentTime;

            // ✅ ignore small diff (NO crack sound)
            if (Math.abs(diff) < 0.3) return;

            // ✅ only fix big drift
            audio.currentTime = position;
        });

        //? Listen for queue updates
        socket.on("queue-updated", ({ queue, currentSong: updatedSong }) => {
            setSongsQueue(queue);
            setCurrentSong(updatedSong);
        });

        //? Listen for new users
        socket.on("user-joined", (newMember: Member) => {
            setMembers(prev => {
                if (prev.some(m => m.id === newMember.id)) return prev;
                return [...prev, {
                    ...newMember
                }];
            });
        });

        //? Listen for users leaving
        socket.on("user-left", (leftMemberId: string) => {
            setMembers(prev => prev.filter(m => m.id !== leftMemberId));
        });

        socket.on("error:join-room", (error) => {
            console.error(error);
            // If room doesn't exist, we might want to redirect
        });

        //? Clock Sync
        const latencies: number[] = [];

        const measureLatency = () => {
            const start = Date.now();
            socket.emit("ping");

            socket.once("pong", (serverTime: number) => {
                const latency = (Date.now() - start) / 2;

                latencies.push(latency);
                if (latencies.length > 5) latencies.shift();

                const avgLatency =
                    latencies.reduce((a, b) => a + b, 0) / latencies.length;

                const offset = serverTime + avgLatency - Date.now();
                setClockOffset(offset);
            });
        };
        measureLatency();
        const pingInterval = setInterval(measureLatency, 5000); // Check latency every 5 seconds

        return () => {
            socket.off("success:join-room");
            socket.off("playback-status");
            socket.off("sync");
            socket.off("user-joined");
            socket.off("user-left");
            socket.off("error:join-room");
            socket.off("queue-updated");
            clearInterval(pingInterval);
        };
    }, [id, clockOffset, isPlaying, handleSyncPlayback]);

    useEffect(() => {
        const unlockAudio = () => {
            const audio = audioRef.current;

            if (!audio) return;

            audio.play()
                .then(() => {
                    audio.pause();
                    setIsAutoplayBlocked(false);
                    console.log("Audio unlocked 🔓");
                })
                .catch(() => { });
        };

        window.addEventListener("click", unlockAudio);
        window.addEventListener("touchstart", unlockAudio);

        return () => {
            window.removeEventListener("click", unlockAudio);
            window.removeEventListener("touchstart", unlockAudio);
        };
    }, []);

    // Invisible Auto-Sync: Listen for ANY interaction to resume audio context if blocked
    useEffect(() => {
        if (!isAutoplayBlocked) return;

        const handleInteraction = () => {
            console.log("User interacted, attempting invisible sync...");
            attemptSync();
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [isAutoplayBlocked]);

    const handleCopy = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const formatDuration = (seconds: number | string) => {
        if (!seconds) return '--:--';
        let totalVal = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
        if (isNaN(totalVal)) return seconds;

        const roundedSeconds = Math.round(totalVal);
        const minutes = Math.floor(roundedSeconds / 60);
        const remainingSeconds = roundedSeconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };


    const handleRemoveSong = (song: any) => {
        socket.emit('remove-song', { song, roomId: id });
    };

    const handleSwitchSong = (song: any) => {
        socket.emit('update-current-song', { song, roomId: id });
    };

    const togglePlay = () => {
        if (adminId !== socket.id) return;

        if (isPlaying) {
            socket.emit('pause-song', { roomId: id, currentTime: audioRef.current?.currentTime || 0 });
        } else {
            socket.emit('play-song', { roomId: id, currentTime: audioRef.current?.currentTime || 0 });
        }
    };

    const attemptSync = () => {
        if (pendingPlaybackRef.current) {
            handleSyncPlayback(pendingPlaybackRef.current);
            pendingPlaybackRef.current = null;
        } else if (audioRef.current) {
            audioRef.current.play()
                .then(() => {
                    setIsAutoplayBlocked(false);
                    setIsPlaying(true);
                })
                .catch(e => console.error("Auto-sync attempt failed:", e));
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (adminId !== socket.id) return;

        const wrapper = e.currentTarget;
        const rect = wrapper.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percent * duration;

        socket.emit('seek-song', { roomId: id, currentTime: newTime });
    };

    const onTimeUpdate = () => {
        if (!audioRef.current) return;
        setCurrentTime(audioRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        if (!audioRef.current) return;
        setDuration(audioRef.current.duration);

        // Apply pending playback state from join (fixes race condition for new joiners)
        if (pendingPlaybackRef.current) {
            handleSyncPlayback(pendingPlaybackRef.current);
            pendingPlaybackRef.current = null;
        }
    };

    const DeviceIcon = ({ type, className, isHost }: { type: string, className?: string, isHost?: boolean }) => {
        switch (type) {
            case 'Mobile':
                return <HiOutlineDevicePhoneMobile className={className} />;
            case 'Tablet':
                return <BsTablet className={className} />;
            case 'Laptop':
            default:
                return <img src={isHost ? laptopIcon : memberLaptopIcon} className={className} alt="Laptop" />;
        }
    };

    return (
        <div className="party-container">
            <div className="ambient-glow glow-top-left"></div>
            <div className="ambient-glow glow-bottom-right"></div>

            <img src={logo} alt="Music.Co" className="logo" />
            <header className="party-header">
                <div className="header-left">
                    <div className="room-info-header" onClick={() => navigate('/upload')}>
                        <span className="back-icon">✕</span>
                        <h1 className="room-info-title">Room Info</h1>
                    </div>
                    <div className="room-code-section">
                        <div>
                            <span className="room-code-label">Room Code:</span>
                            <span className="room-code-value">{id}</span>
                        </div>

                        <div className="header-right">
                            <button className="share-btn" onClick={() => setIsShareModalOpen(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'white' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>


            </header>

            <div className="interface-toggle-wrapper">
                <div className={`interface-toggle-capsule ${isMusicPlayerInterface ? 'music-active' : 'members-active'}`}>
                    <div className="capsule-slider"></div>
                    <button
                        className={`toggle-option ${isMusicPlayerInterface ? 'active' : ''}`}
                        onClick={() => setIsMusicPlayerInterface(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="toggle-icon">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        <span>Player</span>
                    </button>
                    <button
                        className={`toggle-option ${!isMusicPlayerInterface ? 'active' : ''}`}
                        onClick={() => setIsMusicPlayerInterface(false)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="toggle-icon">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>Members</span>
                    </button>
                </div>
            </div>

            {isMusicPlayerInterface ? (
                <main className="party-main music-player-view">
                    <div className="music-player-container">
                        {currentSong && (
                            <section className="now-playing-section">
                                <div className={`now-playing-card ${isPlaying ? 'playing' : ''}`}>
                                    <div className="visualizer-container">
                                        <div className="music-disc-container">
                                            <div className="music-disc">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 18V5l12-2v13"></path>
                                                    <circle cx="6" cy="18" r="3"></circle>
                                                    <circle cx="18" cy="16" r="3"></circle>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="audio-bars">
                                            <div className="bar"></div>
                                            <div className="bar"></div>
                                            <div className="bar"></div>
                                            <div className="bar"></div>
                                            <div className="bar"></div>
                                        </div>
                                    </div>
                                    <div className="now-playing-info">
                                        <span className="now-playing-label">Now Playing</span>
                                        <h2 className="now-playing-name">{currentSong.name}</h2>
                                        <p className="now-playing-details">{currentSong.artist || 'Unknown Artist'} • {formatDuration(currentSong.duration)} min</p>

                                        <div className="playback-controls">
                                            <div className="progress-container">
                                                <div
                                                    className="progress-bar-wrapper"
                                                    onClick={handleSeek}
                                                >
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                                                    ></div>
                                                    <div
                                                        className="progress-bar-handle"
                                                        style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                                                    ></div>
                                                </div>
                                                <div className="time-info">
                                                    <span>{formatDuration(currentTime)}</span>
                                                    <span>{formatDuration(duration)}</span>
                                                </div>
                                            </div>

                                            <div className="control-buttons">
                                                {adminId === socket.id && (
                                                    <button
                                                        className="play-pause-btn"
                                                        onClick={togglePlay}
                                                    >
                                                        {isPlaying ? (
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <rect x="6" y="4" width="4" height="16"></rect>
                                                                <rect x="14" y="4" width="4" height="16"></rect>
                                                            </svg>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M8 5v14l11-7z"></path>
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {currentSong.url && (
                                            <audio
                                                ref={audioRef}
                                                src={currentSong.url}
                                                onTimeUpdate={onTimeUpdate}
                                                onLoadedMetadata={onLoadedMetadata}
                                                onEnded={() => setIsPlaying(false)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="song-queue-section">
                            <div className="queue-header">
                                <h2 className="queue-title">Up Next</h2>

                            </div>

                            <div className="songs-list">
                                {songsQueue.filter(s => s.id !== currentSong?.id).length > 0 ? (
                                    songsQueue.filter(s => s.id !== currentSong?.id).map((song, index) => (
                                        <div
                                            key={song.id || index}
                                            className="song-item clickable"
                                            onClick={() => handleSwitchSong(song)}
                                        >
                                            <div className="song-item-left">
                                                <div className="song-index-wrapper">
                                                    <span className="song-index">{(index + 1).toString().padStart(2, '0')}</span>
                                                    <div className="play-icon-mini">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M5 3l14 9-14 9V3z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="song-info">
                                                    <span className="song-name">{song.name}</span>
                                                    <span className="song-details">{song.artist || 'Unknown Artist'} • {formatDuration(song.duration)}</span>
                                                </div>
                                            </div>
                                            <div className="song-item-right">
                                                {adminId === socket.id && (
                                                    <button
                                                        className="remove-song-btn"
                                                        onClick={() => handleRemoveSong(song)}
                                                        title="Remove from queue"
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-queue">
                                        {!currentSong && (
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18V5l12-2v13"></path>
                                                <circle cx="6" cy="18" r="3"></circle>
                                                <circle cx="18" cy="16" r="3"></circle>
                                            </svg>
                                        )}
                                        <p>{currentSong ? "No more songs in queue" : "Queue is empty. Add some music!"}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            ) : (
                <>
                    <main className="party-main">
                        <section className="host-section">
                            <div className="host-device-info">
                                <div className="host-device-type">
                                    {members.find(m => m.id === adminId)?.device_type || 'Laptop'}
                                </div>
                                <div className="host-device-name">
                                    {members.find(m => m.id === adminId)?.device_name || 'Primary Device'}
                                </div>
                            </div>

                            <div className="host-icon-wrapper react-icon-wrapper">
                                <DeviceIcon
                                    type={members.find(m => m.id === adminId)?.device_type || 'Laptop'}
                                    className="host-laptop-icon"
                                    isHost={true}
                                />
                            </div>

                            <div className="host-display-name">
                                Host: {adminId === socket.id ? "Your Device" : `@User_${adminId.substring(0, 5)}`}
                            </div>

                            <div className="mode-toggle-wrapper">
                                <div className={`toggle-container ${mode}`}>
                                    <div className="toggle-slider"></div>
                                    <button
                                        className={`toggle-btn ${mode === 'boom' ? 'active' : ''}`}
                                        onClick={() => setMode('boom')}
                                    >
                                        Boom
                                    </button>
                                    <button
                                        className={`toggle-btn ${mode === 'traverse' ? 'active' : ''}`}
                                        onClick={() => setMode('traverse')}
                                    >
                                        Traverse
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="members-section">
                            <h2 className="members-title">Other Members</h2>
                            <p className="members-count-info">Min. 2 devices, Max. 8 devices</p>

                            <div className="members-grid">
                                {members.filter(m => m.id !== adminId).map((member, index) => (
                                    <div key={member.id} className="member-card">
                                        <span className="member-number">{index + 1}</span>
                                        <div className="member-icon-wrapper">
                                            <DeviceIcon type={member.device_type} className={`member-icon ${member.device_type.toLowerCase()}`} isHost={false} />
                                        </div>
                                        <div className="member-info">
                                            <span className="member-device-type">{member.device_type}</span>
                                            <span className="member-device-name">{member.device_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>
                </>
            )}

            {isShareModalOpen && (
                <div className="modal-overlay" onClick={() => setIsShareModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Invite Friends</h3>
                            <button className="close-modal" onClick={() => setIsShareModalOpen(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            <p className="share-description">Share this link with your friends to join the party!</p>

                            <div className="share-room-code-display">
                                <span className="label">Room Code:</span>
                                <span className="value">{id}</span>
                            </div>

                            <div className="share-input-group">
                                <input
                                    type="text"
                                    readOnly
                                    value={window.location.href}
                                    className="share-url-input"
                                />
                                <button className={`copy-btn ${copySuccess ? 'success' : ''}`} onClick={handleCopy}>
                                    {copySuccess ? (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            <span>Copied</span>
                                        </>
                                    ) : 'Copy Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartyPage;

