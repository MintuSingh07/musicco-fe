import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/musicco_logo.svg';
import laptopIcon from '../assets/laptop.svg';
import mobileIcon from '../assets/mobile.svg';
import tabletIcon from '../assets/tablet.svg';
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
    const [mode, setMode] = useState<'traverse' | 'boom'>('traverse');
    const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [isMusicPlayerInterface, setIsMusicPlayerInterface] = useState<boolean>(true);

    useEffect(() => {
        if (!id) return;

        //? Join room on mount (handles direct links)
        socket.emit('join-room', { roomId: id });

        //? Listen for initial room data and join success
        socket.on("success:join-room", ({ roomId, members: initialMembers, admin: currentAdminId, songsQueue: initialQueue, currentSong: initialSong }) => {
            if (roomId === id) {
                setAdminId(currentAdminId);
                const formattedMembers: Member[] = initialMembers.map((m: any) => ({
                    ...m,
                    icon: m.device_type === 'Laptop' ? laptopIcon : (m.device_type === 'Tablet' ? tabletIcon : mobileIcon)
                }));
                setMembers(formattedMembers);
                setSongsQueue(initialQueue || []);
                setCurrentSong(initialSong || null);
            }
        });

        //? Listen for queue updates
        socket.on("queue-updated", ({ queue, currentSong: updatedSong }) => {
            setSongsQueue(queue);
            setCurrentSong(updatedSong);
        });

        //? Listen for new users
        socket.on("user-joined", (newMember: any) => {
            setMembers(prev => {
                if (prev.some(m => m.id === newMember.id)) return prev;
                return [...prev, {
                    ...newMember,
                    icon: newMember.device_type === 'Laptop' ? laptopIcon : (newMember.device_type === 'Tablet' ? tabletIcon : mobileIcon)
                }];
            });
        });

        //? Listen for users leaving
        socket.on("user-left", (leftMemberId) => {
            setMembers(prev => prev.filter(m => m.id !== leftMemberId));
        });

        socket.on("error:join-room", (error) => {
            console.error(error);
            // If room doesn't exist, we might want to redirect
        });

        return () => {
            socket.off("success:join-room");
            socket.off("user-joined");
            socket.off("user-left");
            socket.off("error:join-room");
            socket.off("queue-updated");
        };
    }, [id]);

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

    return (
        <div className="party-container">
            <div className="ambient-glow glow-top-left"></div>
            <div className="ambient-glow glow-bottom-right"></div>

            <img src={logo} alt="Music.Co" className="logo" onClick={() => navigate('/')} />
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
                                <div className="now-playing-card">
                                    <div className="visualizer-container">
                                        <div className="music-disc-container">
                                            <div className="music-disc">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 18V5l12-2v13"></path>
                                                    <circle cx="6" cy="18" r="3"></circle>
                                                    <circle cx="18" cy="16" r="3"></circle>
                                                </svg>
                                            </div>
                                            <div className="disc-center"></div>
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

                            <div className="host-icon-wrapper">
                                <img
                                    src={
                                        members.find(m => m.id === adminId)?.device_type === 'Mobile' ? mobileIcon :
                                            (members.find(m => m.id === adminId)?.device_type === 'Tablet' ? tabletIcon : laptopIcon)
                                    }
                                    alt="Host Device"
                                    className="host-laptop-icon"
                                />
                            </div>

                            <div className="host-display-name">
                                Host: {adminId === socket.id ? "Your Device" : `@User_${adminId.substring(0, 5)}`}
                            </div>

                            <div className="mode-toggle-wrapper">
                                <div className={`toggle-container ${mode}`}>
                                    <div className="toggle-slider"></div>
                                    <button
                                        className={`toggle-btn ${mode === 'traverse' ? 'active' : ''}`}
                                        onClick={() => setMode('traverse')}
                                    >
                                        Traverse
                                    </button>
                                    <button
                                        className={`toggle-btn ${mode === 'boom' ? 'active' : ''}`}
                                        onClick={() => setMode('boom')}
                                    >
                                        Boom
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
                                        <img src={member.icon} alt={member.device_type} className={`member-icon ${member.device_type.toLowerCase()}`} />
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

