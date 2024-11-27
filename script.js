const clientId = "c832c8697d834f4ca7d46793f73410ca";
const redirectUri = "https://deskthing.stardomga.me/index.html"; // Update with your Netlify URL
const scopes = "user-read-currently-playing user-read-playback-state user-modify-playback-state";

let accessToken = getAccessToken();
let playbackInterval;

function handleLoginButtonVisibility() {
    const loginButton = document.getElementById("login-btn");
    if (accessToken) {
        loginButton.style.display = "none"; // Hide the login button
    } else {
        loginButton.style.display = "block"; // Show the login button
    }
}

// Extract the access token from URL hash
function getAccessToken() {
    const hash = window.location.hash.substring(1); // Get everything after #
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    console.log("Access Token Retrieved: ", accessToken);
    return accessToken;
}

// Wait for the document to be ready
document.addEventListener("DOMContentLoaded", function () {
    console.log("Document Loaded");

    accessToken = getAccessToken();
    console.log("Access Token on Load: ", accessToken);
    handleLoginButtonVisibility();

    if (accessToken) {
        fetchCurrentlyPlaying(accessToken);
        startPlaybackUpdates();
    }

    // Trigger Spotify login
    document.getElementById("login-btn").addEventListener("click", () => {
        const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&scope=${encodeURIComponent(scopes)}`;
        window.location.href = authUrl;
    });

    // Attach event listeners to the play/pause button
    const playPauseButton = document.getElementById("play-pause-btn");
    playPauseButton.addEventListener("click", () => {
        togglePlayPause();
    });

    // Progress bar functionality
    document.getElementById("progress-bar").addEventListener("input", (e) => {
        const newPosition = parseInt(e.target.value, 10); // Get the new position from the progress bar

        // Only make the API call if the position has changed
        if (newPosition >= 0) {
            console.log("Seeking to new position:", newPosition);
            seekPosition(newPosition); // Call the seek function
        }
    });

    // Next and Previous Song buttons
    document.getElementById("next-btn").addEventListener("click", () => {
        skipToNextSong(accessToken);
    });

    document.getElementById("prev-btn").addEventListener("click", () => {
        skipToPreviousSong(accessToken);
    });
});

// Periodically fetch playback state
function startPlaybackUpdates() {
    playbackInterval = setInterval(() => {
        fetchCurrentlyPlaying(accessToken);
    }, 1000); // Update every second
}

// Stop playback updates
function stopPlaybackUpdates() {
    clearInterval(playbackInterval);
}

// Fetch the currently playing track
async function fetchCurrentlyPlaying(accessToken) {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    console.log("Fetch Currently Playing Response: ", response);

    if (response.status === 200) {
        const data = await response.json();
        console.log("Currently Playing Data: ", data);
        updatePlayPauseButton(data.is_playing); // Update button state
        if (data.is_playing) {
            displaySongInfo(data);
        } else {
            stopPlaybackUpdates(); // Stop updates if playback is paused
        }
    } else {
        console.log("Error fetching playback data:", response.statusText);
    }
}

// Update Play/Pause button
function updatePlayPauseButton(isPlaying) {
    const playPauseButton = document.getElementById("play-pause-btn");

    // Remove both 'playing' and 'paused' classes first to reset state
    playPauseButton.classList.remove("playing", "paused");

    if (isPlaying) {
        // Add the 'playing' class to set the pause icon
        playPauseButton.classList.add("playing");
    } else {
        // Add the 'paused' class to set the play icon
        playPauseButton.classList.add("paused");
    }
}

// Toggle Play/Pause functionality
async function togglePlayPause() {
    const playPauseButton = document.getElementById("play-pause-btn");
    const isPlaying = playPauseButton.classList.contains("playing"); // Check current state

    if (isPlaying) {
        await controlPlayback(accessToken, "pause");
        updatePlayPauseButton(false);
        stopPlaybackUpdates();
    } else {
        await controlPlayback(accessToken, "play");
        updatePlayPauseButton(true);
        startPlaybackUpdates();
    }
}

// Display song information and set background
function displaySongInfo(data) {
    const songInfoDiv = document.getElementById("song-info");
    const songName = document.getElementById("song-name");
    const artistName = document.getElementById("artist-name");
    const albumArt = document.getElementById("album-art");

    songName.textContent = data.item.name;
    artistName.textContent = `By: ${data.item.artists.map((artist) => artist.name).join(", ")}`;
    albumArt.src = data.item.album.images[0].url;

    // Update progress bar
    updateProgressBar(data.progress_ms, data.item.duration_ms);

    // Set the blurred album cover as background
    const blurredBg = document.getElementById("blurred-bg");
    const albumCoverUrl = data.item.album.images[0]?.url;

    if (albumCoverUrl) {
        console.log("Setting background image to:", albumCoverUrl);
        blurredBg.style.backgroundImage = `url(${albumCoverUrl})`;
    } else {
        console.error("Album cover URL is missing.");
    }

    songInfoDiv.classList.remove("hidden");
}

// Spotify player controls
async function controlPlayback(accessToken, action, position_ms = null) {
    const urlMap = {
        play: "https://api.spotify.com/v1/me/player/play",
        pause: "https://api.spotify.com/v1/me/player/pause",
    };

    const options = {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    };

    if (action === "play" && position_ms !== null) {
        // Optionally include a specific position to start playback
        options.body = JSON.stringify({ position_ms });
    }

    const response = await fetch(urlMap[action], options);

    if (response.ok) {
        console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} action successful`);
        fetchCurrentlyPlaying(accessToken); // Refresh the UI
    } else {
        console.error(`Failed to ${action} playback:`, response.status, response.statusText);
    }
}

// Skip to next song
async function skipToNextSong(accessToken) {
    const response = await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.ok) {
        console.log("Skipped to next song");
        fetchCurrentlyPlaying(accessToken); // Refresh the UI
    } else {
        console.error("Failed to skip to next song:", response.status, response.statusText);
    }
}

// Skip to previous song
async function skipToPreviousSong(accessToken) {
    const response = await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.ok) {
        console.log("Skipped to previous song");
        fetchCurrentlyPlaying(accessToken); // Refresh the UI
    } else {
        console.error("Failed to skip to previous song:", response.status, response.statusText);
    }
}

// Custom seek function
function seekPosition(position_ms) {
    const seekPos = { position_ms: position_ms };

    $.ajax({
        url: 'https://api.spotify.com/v1/me/player/seek?' + $.param(seekPos),
        contentType: 'application/x-www-form-urlencoded',
        type: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        success: function (response) {
            console.log('Seek successful', response);
            fetchCurrentlyPlaying(accessToken); // Refresh the UI
        },
        error: function (error) {
            console.error('Error seeking track:', error);
        }
    });
}

// Update progress bar
function updateProgressBar(progress, duration) {
    const progressBar = document.getElementById("progress-bar");
    progressBar.max = duration;
    progressBar.value = progress;

    const progressTime = document.getElementById("progress-time");
    const durationTime = document.getElementById("duration-time");

    progressTime.textContent = formatTime(progress);
    durationTime.textContent = formatTime(duration);
}

// Format milliseconds into mm:ss
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}
