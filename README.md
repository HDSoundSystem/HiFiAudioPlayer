# HiFi Audio Player 🎧

A sleek, high-fidelity web-based audio station designed for desktop enthusiasts. This application offers a premium dark-themed interface with a golden "HiFi" aesthetic, professional-grade controls, and full PWA (Progressive Web App) support for a native desktop experience.

<img width="1169" height="833" alt="A1" src="https://github.com/user-attachments/assets/40b9e5ad-39bc-4f1a-bd67-8625cfaaed8a" />

## ✨ Key Features

### 🎵 Playback & Navigation
* **High-Resolution Audio Support**: Compatible with **FLAC**, **WAV**, **MP3** and **M4A** formats.
* **Ergonomic Controls**: Centralized **BACK** and **NEXT** buttons framing the main **PLAY/PAUSE** button.
* **Progress Bar**: Click anywhere on the progress bar to seek to any position in the track.
* **Smart Metadata**: Automatically extracts song title, artist name, album name and embedded **album artwork** using `jsmediatags`.

### 📋 Playlist
* **Queue Management**: Add multiple files at once via the **ADD FILES** button.
* **Direct Track Selection**: Click any track in the playlist to play it instantly.
* **Clear Queue**: Reset the entire playlist with the **CLEAR** button.
* **Album Display**: Album name is shown above the playlist when available in the file's metadata.

### 🔀 Playback Modes
* **Shuffle**: Randomizes track order while avoiding replaying the current track.
* **Repeat**: Three modes — **OFF**, **ONE** (loop current track), **ALL** (loop entire playlist).
* **A-B Loop**: Set a precise loop section within a track — press once to mark point **A**, again to mark point **B**, the player then loops that segment. Press a third time to reset.

### 🔊 Volume & Audio
* **Fluid Volume Slider**: Click or drag the volume bar for smooth, real-time adjustment. Volume level is **saved automatically** and restored on next visit.
* **Mute**: Instantly mute/unmute without losing your volume setting.

### 📊 Equalizer (EQ Panel)
Open the **EQ panel** with the **EQ** button — the interface expands dynamically to reveal:
* **10-Band Equalizer**: Vertical sliders covering 32 Hz to 16 kHz, each powered by a real Web Audio API `BiquadFilter`.
* **EQ Curve**: A real-time graphical display of the frequency response curve, updated live as you adjust sliders.
* **5 Presets**: One-click EQ profiles — **POP**, **ROCK**, **JAZZ**, **CLASSIC**, **LIVE**.
* **Bass Control**: Dedicated low-shelf filter slider (±12 dB) for overall bass adjustment.
* **Treble Control**: Dedicated high-shelf filter slider (±12 dB) for overall treble adjustment.
* **Loudness**: Boosts bass (+6 dB) and treble (+4 dB) simultaneously to compensate for low listening volumes.
* **Reset**: Resets all 10 bands, Bass, Treble and Loudness to flat in one click.

### 📈 VU Meter Visualizer
* **Real-Time Spectrum**: Animated bar visualizer driven by the Web Audio API analyser node.
* **Peak Indicators**: Each bar displays a peak hold marker (in orange) that slowly falls after the peak.
* **Toggle**: The **VU** button switches the visualizer on or off without interrupting playback.

### 🖥️ UI & Experience
* **Premium HiFi UI**: Sophisticated dark mode with a golden radial glow halo effect.
* **Dynamic EQ Panel**: The player window smoothly expands and collapses when opening/closing the EQ.
* **Format Badge**: Displays the audio format (FLAC, WAV, MP3…) of the currently playing track.
* **Persistent Settings**: Volume level is saved to local storage and restored on next session.
* **PWA Ready**: Installable as a standalone desktop app on **Windows**, **macOS** and **Linux**.
* **Desktop-Optimized**: Custom-built for large screens with a dedicated blocker for mobile devices.
* **Apple Compatibility**: Fully optimized for Safari with specific meta-tags for a "Web Clip" experience.

---

## 🛠️ Technical Stack

* **Frontend**: HTML5, CSS3 (Custom Properties & Flexbox), Bootstrap 5
* **Audio Engine**: Web Audio API (`AudioContext`, `BiquadFilter`, `AnalyserNode`)
* **Icons**: FontAwesome 6
* **Metadata**: [jsmediatags](https://github.com/aadsm/jsmediatags) for embedded tag extraction
* **PWA**: Service Workers & `manifest.json` for desktop installation

---

## 📂 Project Structure

```text
├── index.html          # Main application structure
├── style.css           # Styling with Golden Halo & Dark Mode
├── script.js           # Audio engine, EQ, Playlist & Visualizer logic
├── manifest.json       # Desktop installation configuration
└── img/
    └── favicon.png     # Custom application icon (HiFi styled)
```

---

## 🚀 Installation & Setup

1. **Clone or Download**: Save all files into a single directory.
2. **Hosting**: Since this is a PWA, it requires a local server or web hosting (HTTPS) to enable the "Install" button.
   * *Option A (Local)*: Use the **Live Server** extension in VS Code.
   * *Option B (Online)*: Upload to GitHub Pages, Vercel, or Netlify.
3. **Install as App**:
   * Open the app in Chrome, Edge or Safari.
   * Click the **Install Icon** in the address bar (Desktop) or "Add to Home Screen" (Mac Dock).
   * The HiFi Player will now appear as a native application.

---

## 🎵 How to Use

1. **Add Music**: Click **ADD FILES** to import your music collection (FLAC, WAV, MP3, M4A).
2. **Playback**: Use **BACK**, **PLAY/PAUSE** and **NEXT** to navigate your queue.
3. **Seek**: Click anywhere on the progress bar to jump to a position in the track.
4. **Volume**: Drag the volume slider. Your level is remembered after closing the browser.
5. **Modes**: Use **SHUFFLE**, **REPEAT** and **MUTE** to customize your listening experience.
6. **A-B Loop**: Press **A-B** once to set the start point, again to set the end point — the player loops that section. Press a third time to cancel.
7. **Equalizer**: Click **EQ** to open the equalizer panel. Choose a preset or manually adjust the 10 bands, Bass and Treble sliders. Use **LOUDNESS** for low-volume listening and **RESET** to return to flat.
8. **Visualizer**: Toggle the spectrum analyser on or off with the **VU** button.
9. **Queue**: Use the **CLEAR** button to reset the playlist.

<img width="1546" height="829" alt="A2" src="https://github.com/user-attachments/assets/5a0221bf-05d3-419c-9bef-75b6654ed6b0" />
