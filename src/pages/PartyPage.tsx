import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/musicco_logo.svg';
import laptopIcon from '../assets/laptop.svg';
import laptop2Icon from '../assets/laptop-2.png';
import mobileIcon from '../assets/mobile.svg';
import tabletIcon from '../assets/tablet.svg';
import './PartyPage.css';

interface Member {
    id: number;
    type: 'Mobile' | 'Tablet' | 'Laptop';
    name: string;
    icon: string;
    deviceName: string;
}

const PartyPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'traverse' | 'boom'>('traverse');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const members: Member[] = [
        { id: 2, type: 'Mobile', name: 'iPhone 13 Pro', icon: mobileIcon, deviceName: 'iPhone 13 Pro' },
        { id: 3, type: 'Tablet', name: 'iPad Gen3', icon: tabletIcon, deviceName: 'iPad Gen3' },
        { id: 4, type: 'Mobile', name: 'Vivo 23 Ultra', icon: mobileIcon, deviceName: 'Vivo 23 Ultra' },
        { id: 5, type: 'Mobile', name: 'Samsung 23 Ultra', icon: mobileIcon, deviceName: 'Samsung 23 Ultra' },
        { id: 6, type: 'Laptop', name: 'HP Victus', icon: laptop2Icon, deviceName: 'HP Victus' },
        { id: 7, type: 'Mobile', name: 'Samsung 23 Ultra', icon: mobileIcon, deviceName: 'Samsung 23 Ultra' },
        { id: 8, type: 'Mobile', name: 'Samsung 23 Ultra', icon: mobileIcon, deviceName: 'Samsung 23 Ultra' },
        { id: 9, type: 'Mobile', name: 'Samsung 23 Ultra', icon: mobileIcon, deviceName: 'Samsung 23 Ultra' },
        { id: 10, type: 'Mobile', name: 'Samsung 23 Ultra', icon: mobileIcon, deviceName: 'Samsung 23 Ultra' },
    ];

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
                        <div className="host-device-type">Laptop</div>
                        <div className="host-device-name">HP TUF</div>
                    </div>

                    <div className="host-icon-wrapper">
                        <img src={laptopIcon} alt="Host Device" className="host-laptop-icon" />
                    </div>

                    <div className="host-display-name">Host: @User649JwK</div>

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
                        {members.map((member) => (
                            <div key={member.id} className="member-card">
                                <span className="member-number">{member.id}</span>
                                <img src={member.icon} alt={member.type} className={`member-icon ${member.type.toLowerCase()}`} />
                                <div className="member-info">
                                    <span className="member-device-type">{member.type}</span>
                                    <span className="member-device-name">{member.deviceName}</span>
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
                            <h3>Share Link</h3>
                            <button className="close-modal" onClick={() => setIsShareModalOpen(false)}>✕</button>
                        </div>
                        <div className="share-input-group">
                            <input
                                type="text"
                                readOnly
                                value={window.location.href}
                                className="share-url-input"
                            />
                            <button className={`copy-btn ${copySuccess ? 'success' : ''}`} onClick={handleCopy}>
                                {copySuccess ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartyPage;

