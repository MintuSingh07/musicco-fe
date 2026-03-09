import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/musicco_logo.svg";
import uploadIcon from "../assets/upload.png";
import "./UploadPage.css";
import { socket } from "../socket";

const MOCK_SONGS = [
    { id: 1, title: "Tum Hi Ho", artist: "Arijit Singh, Mithoon" },
    { id: 2, title: "Channa Mereya", artist: "Arijit Singh, Pritam" },
    { id: 3, title: "Kabira", artist: "Arijit Singh, Harshdeep Kaur" },
    { id: 4, title: "Apna Bana Le", artist: "Arijit Singh, Sachin-Jigar" },
    { id: 5, title: "Kesariya", artist: "Arijit Singh, Pritam" },
    { id: 6, title: "Pasoori", artist: "Shae Gill, Ali Sethi" },
    { id: 7, title: "Excuses", artist: "AP Dhillon, Gurinder Gill" },
    { id: 8, title: "Insane", artist: "AP Dhillon, Shinda Kahlon" }
];

const UploadPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [roomCode, setRoomCode] = useState<string[]>(new Array(10).fill(""));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const pendingSongs = useRef<any[]>([]);

    useEffect(() => {
        //? Listen for create room success
        socket.on("success:create-room", ({ roomId }) => {
            console.log("Room created successfully:", roomId);

            // If we have pending songs from an upload, add them to the room
            if (pendingSongs.current.length > 0) {
                socket.emit("add-song", {
                    songs: pendingSongs.current,
                    roomId: roomId
                });
                pendingSongs.current = []; // Clear pending songs
            }

            navigate(`/party/${roomId}`);
        });

        //? Listen for join room success
        socket.on("success:join-room", ({ roomId }) => {
            console.log("Joined room successfully:", roomId);
            navigate(`/party/${roomId}`);
        });

        //? Listen for errors
        socket.on("error:create-room", (error) => {
            setIsLoading(false);
            alert(error);
        });

        socket.on("error:join-room", (error) => {
            alert(error);
        });

        return () => {
            socket.off("success:create-room");
            socket.off("success:join-room");
            socket.off("error:create-room");
            socket.off("error:join-room");
        };
    }, [navigate]);

    const handleCreateRoomAndUploadSongs = async () => {
        if (uploadedFiles.length === 0 && selectedSongs.size === 0) {
            alert("Please select or upload at least one song!");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Handle File Uploads
            if (uploadedFiles.length > 0) {
                const formData = new FormData();
                uploadedFiles.forEach((file) => {
                    formData.append("music", file);
                });

                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api/v1/music/upload`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error("Failed to upload songs");
                }

                const result = await response.json();
                if (result.success) {
                    pendingSongs.current = [...pendingSongs.current, ...result.data];
                }
            }

            // 2. Handle Library Songs (Mock for now, but following the pattern)
            if (selectedSongs.size > 0) {
                const librarySongs = Array.from(selectedSongs).map(id => {
                    const song = MOCK_SONGS.find(s => s.id === id);
                    return {
                        id: `lib_${id}`,
                        name: song?.title,
                        artist: song?.artist,
                        // Add other required fields if backend expects them
                    };
                });
                pendingSongs.current = [...pendingSongs.current, ...librarySongs];
            }

            // 3. Create Room
            socket.emit("create-room");

        } catch (error: any) {
            console.error("Upload error:", error);
            alert(error.message || "An error occurred during upload");
            setIsLoading(false);
        }
    };

    const handleJoinRoom = () => {
        const fullCode = roomCode.join("");
        if (fullCode.length === 10) {
            const formattedCode = `${fullCode.slice(0, 4)}-${fullCode.slice(4, 7)}-${fullCode.slice(7, 10)}`;
            socket.emit("join-room", { roomId: formattedCode });
        } else {
            alert("Please enter a valid 10-character room code.");
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const toggleSongSelection = (id: number) => {
        const newSelected = new Set(selectedSongs);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedSongs(newSelected);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3'));
            if (files.length !== e.dataTransfer.files.length) {
                alert("Only MP3 files are allowed.");
            }
            setUploadedFiles(prev => [...prev, ...files]);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).filter(file => file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3'));
            if (files.length !== e.target.files.length) {
                alert("Only MP3 files are allowed.");
            }
            setUploadedFiles(prev => [...prev, ...files]);

            // Allow selecting the same file again by clearing the input value
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeFile = (indexToRemove: number, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent clicking the box
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleCodeChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);

        const newCode = [...roomCode];
        newCode[index] = value;
        setRoomCode(newCode);

        // Move to next input if value is entered
        if (value && index < 9) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !roomCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/-/g, "").slice(0, 10);
        const newCode = [...roomCode];

        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }

        setRoomCode(newCode);

        // Focus the appropriate input after paste
        const nextIndex = Math.min(pastedData.length, 9);
        inputRefs.current[nextIndex]?.focus();
    };

    const filteredSongs = MOCK_SONGS.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    console.log("Uploaded Files are: ", uploadedFiles);


    return (
        <div className="upload-container">
            <div className="ambient-glow glow-top-left"></div>
            <div className="ambient-glow glow-bottom-right"></div>
            <header className="upload-header">
                <Link to="/">
                    <img src={logo} alt="Music.Co Logo" className="logo" />
                </Link>
            </header>

            <main className="upload-main">
                <div className="upload-titles">
                    <h1 className="upload-title">EXPERIENCE 8D <span className="highlight-text">MUSIC</span></h1>
                    <p className="upload-subtitle">Feel the music move — sync, surround, and experience 8D like never before!</p>
                </div>

                <div className="upload-section-wrapper">
                    <span className="section-label">Upload Music File</span>
                    <div
                        className={`upload-box ${isDragging ? "dragging" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                    >
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileSelect}
                            accept=".mp3,audio/mpeg"
                        />
                        {uploadedFiles.length === 0 ? (
                            <>
                                <img src={uploadIcon} alt="Upload Cloud" className="cloud-icon" />
                                <p className="upload-instruction">Drag & Drop a music files</p>
                                <p className="upload-or">OR</p>
                                <button className="select-files-btn" onClick={(e) => { e.stopPropagation(); triggerFileInput(); }}>Select Files</button>
                            </>
                        ) : (
                            <div className="uploaded-files-list">
                                <h4 className="uploaded-files-title">Ready to upload:</h4>
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="uploaded-file-item">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 18V5l12-2v13"></path>
                                            <circle cx="6" cy="18" r="3"></circle>
                                            <circle cx="18" cy="16" r="3"></circle>
                                        </svg>
                                        <span className="uploaded-file-name">{file.name}</span>
                                        <button className="remove-file-btn" onClick={(e) => removeFile(index, e)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button className="select-files-btn add-more-btn" onClick={(e) => { e.stopPropagation(); triggerFileInput(); }}>Add More Files</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="library-divider">
                    <span>OR SELECT FROM LIBRARY</span>
                </div>

                <div className="library-section">
                    <div className="search-bar">
                        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search song, artist name"
                            className="search-input"
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        <button className="search-submit-btn">Search</button>
                    </div>

                    <div className="song-list-container">
                        {filteredSongs.length > 0 ? filteredSongs.map((song) => (
                            <div
                                className={`song-row ${selectedSongs.has(song.id) ? "selected" : ""}`}
                                key={song.id}
                                onClick={() => toggleSongSelection(song.id)}
                            >
                                <div className="song-art-placeholder">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18V5l12-2v13"></path>
                                        <circle cx="6" cy="18" r="3"></circle>
                                        <circle cx="18" cy="16" r="3"></circle>
                                    </svg>
                                </div>
                                <div className="song-info">
                                    <h4 className="song-title">{song.title}</h4>
                                    <p className="song-artist">{song.artist}</p>
                                </div>
                                <div className="song-select-check">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>
                                No songs found
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="upload-footer">
                <p className="footer-hint"><span className="asterisk">*</span>Host can also select or upload songs after room is created</p>

                <div className="footer-actions">
                    <button
                        className="create-room-btn action-btn"
                        onClick={handleCreateRoomAndUploadSongs}
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating..." : "Create Room"}
                    </button>
                    <span className="action-or">OR</span>
                    <button className="join-room-btn action-btn" onClick={() => setShowJoinModal(true)}>Join Room</button>
                </div>

                <div className="setup-link-container">
                    <a href="#" className="setup-link">How to setup?</a>
                </div>
            </footer>

            {isLoading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>Uploading & Creating Room...</p>
                </div>
            )}

            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Enter Room Code</h2>
                        <div className="code-input-container">
                            <div className="code-segment">
                                {[0, 1, 2, 3].map((i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={roomCode[i]}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        onPaste={handlePaste}
                                        className="code-box"
                                    />
                                ))}
                            </div>
                            <span className="code-dash">-</span>
                            <div className="code-segment">
                                {[4, 5, 6].map((i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={roomCode[i]}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        onPaste={handlePaste}
                                        className="code-box"
                                    />
                                ))}
                            </div>
                            <span className="code-dash">-</span>
                            <div className="code-segment">
                                {[7, 8, 9].map((i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={roomCode[i]}
                                        onChange={(e) => handleCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        onPaste={handlePaste}
                                        className="code-box"
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowJoinModal(false)}>Cancel</button>
                            <button className="submit-join-btn" onClick={handleJoinRoom}>Join</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadPage;
