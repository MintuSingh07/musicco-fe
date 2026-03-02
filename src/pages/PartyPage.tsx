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
    const [adminId, setAdminId] = useState<string>('');
    const [mode, setMode] = useState<'traverse' | 'boom'>('traverse');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        if (!id) return;

        //? Join room on mount (handles direct links)
        socket.emit('join-room', { roomId: id });

        //? Listen for initial room data and join success
        socket.on("success:join-room", ({ roomId, members: initialMembers, admin: currentAdminId }) => {
            if (roomId === id) {
                setAdminId(currentAdminId);
                const formattedMembers: Member[] = initialMembers.map((m: any) => ({
                    ...m,
                    icon: m.device_type === 'Laptop' ? laptopIcon : (m.device_type === 'Tablet' ? tabletIcon : mobileIcon)
                }));
                setMembers(formattedMembers);
            }
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
        };
    }, [id]);

    const handleCopy = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
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

