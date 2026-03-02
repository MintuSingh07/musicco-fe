import { useNavigate } from "react-router-dom";
import logo from "../assets/musicco_logo.svg";
import headphone from "../assets/headphone.svg";
import "./HomePage.css";

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <div className="ambient-glow glow-top-left"></div>
            <div className="ambient-glow glow-bottom-right"></div>
            <header className="home-header">
                <img src={logo} alt="Music.Co Logo" className="logo" />
            </header>

            <main className="home-main">
                <div className="hero-text-section">
                    <h3 className="hero-subtitle">AI POWERED 8D MUSIC PLAYER</h3>
                    <h1 className="hero-title">
                        FEEL <span className="highlight-text">MUSIC</span> ACCORDING TO YOUR MOOD
                    </h1>
                </div>

                <div className="hero-image-section">
                    <img src={headphone} alt="Headphone" className="hero-headphone" />
                </div>
            </main>

            <footer className="home-footer">
                <button className="start-journey-btn" onClick={() => navigate("/upload")}>
                    Start Journey
                    <span className="arrow">→</span>
                </button>
            </footer>
        </div>
    );
};

export default HomePage;
