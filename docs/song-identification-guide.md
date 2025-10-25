# Song Identification System Guide

## Overview
The Song Identification System provides Soundhound-style song recognition with lyrics, album art, and PersonI commentary. It automatically identifies songs playing in the background and displays them in an elegant glass-morphism bubble UI.

## Features

### 🎵 Song Identification
- **Automatic Detection**: Triggers 7 seconds after music is detected
- **Audio Fingerprinting**: Captures 10 seconds of audio for identification
- **Multiple APIs**: Supports AudD (implemented) and ACRCloud (planned)
- **Rich Metadata**: Title, artist, album, year, genre, album art, duration
- **External Links**: Direct links to Spotify, YouTube, Deezer

### 📝 Lyrics Display
- **Synchronized Lyrics**: Time-aligned lyrics that scroll during playback
- **Plain Text Fallback**: Shows plain lyrics if synchronized not available
- **Multiple Sources**: Genius API (implemented), Musixmatch (planned)
- **Auto-Scrolling**: Lyrics automatically scroll to current position

### 🎨 UI Components
- **Glass-Morphism Bubble**: Beautiful translucent overlay with blur effects
- **Album Art**: High-quality album artwork with confidence ring indicator
- **Minimizable**: Can minimize to a small circular icon
- **Auto-Hide**: Automatically hides 5 seconds after music stops
- **Manual Controls**: Close button and minimize button

### 🤖 PersonI Integration
- **Contextual Commentary**: PersonI makes comments about identified songs
- **Memory Recognition**: Remembers previously heard songs using RAG
- **Unique Reactions**: Each PersonI has their own style of commentary
- **Smart Timing**: Won't interrupt user speech or ongoing conversations

### 💾 Memory System
- **Song History**: Stores all identified songs in RAG memory
- **Rich Metadata**: Includes title, artist, album, genre, timestamp
- **Future Context**: PersonI can reference songs heard in the past
- **Memory Type**: Uses 'song_identification' type for easy filtering

## Configuration

### API Keys Setup

The Song Identification system requires API keys from music identification and lyrics services. Currently, configuration must be done programmatically:

```javascript
// Configure AudD API for song identification
songIdentificationService.updateConfig({
  apiProvider: 'audd',
  apiKeys: {
    audd: {
      apiToken: 'YOUR_AUDD_API_TOKEN'
    }
  }
});

// Configure Genius API for lyrics
songIdentificationService.updateConfig({
  fetchLyrics: true,
  lyricsProvider: 'genius',
  apiKeys: {
    genius: {
      accessToken: 'YOUR_GENIUS_ACCESS_TOKEN'
    }
  }
});
```

### Getting API Keys

#### AudD API (Recommended)
1. Visit [AudD.io](https://audd.io/)
2. Sign up for a free account
3. Get your API token from the dashboard
4. Free tier: 30,000 requests/month

#### Genius API (for lyrics)
1. Visit [Genius API](https://genius.com/api-clients)
2. Create a new API client
3. Get your access token
4. Free tier available

#### ACRCloud (Alternative, not yet implemented)
1. Visit [ACRCloud](https://www.acrcloud.com/)
2. Create an account
3. Get access key and secret
4. Free tier: 2000 requests/month

### Feature Toggles

```javascript
// Enable/disable song identification
songIdentificationService.updateConfig({
  enabled: true,  // Enable the service
  autoIdentify: true,  // Auto-identify when music is detected
});

// Control PersonI commentary
songIdentificationService.updateConfig({
  personiCommentary: true,  // Enable PersonI comments
});

// Control lyrics display
songIdentificationService.updateConfig({
  fetchLyrics: true,  // Fetch and display lyrics
});

// Adjust identification delay
songIdentificationService.updateConfig({
  identificationDelayMs: 7000,  // Wait 7 seconds before identifying
});

// Control bubble visibility
songIdentificationService.updateConfig({
  showBubble: true,  // Show the UI bubble
});
```

## Usage

### Automatic Identification

When song identification is enabled, the system automatically:

1. **Detects Music**: MusicDetector identifies when music is playing (vs. speech)
2. **Waits**: Waits for configured delay (default 7 seconds) to ensure stable audio
3. **Captures**: Records 10 seconds of audio using SharedMicrophoneManager
4. **Identifies**: Sends audio to configured API for identification
5. **Displays**: Shows results in the song info bubble
6. **Fetches Lyrics**: Retrieves lyrics from configured lyrics API
7. **Comments**: PersonI makes a contextual comment about the song
8. **Stores**: Saves song info to RAG memory for future reference

### Manual Interaction

Users can interact with the song bubble:

- **Click Minimize**: Collapse to small circular icon
- **Click Close**: Dismiss the bubble and clear current song
- **Click Links**: Open song in Spotify, YouTube, or other services
- **Scroll Lyrics**: Manually scroll through lyrics if needed

### PersonI Commentary Examples

When a song is identified, PersonI will make comments based on:

- **First Time Hearing**: "I recognize this as [Song] by [Artist]! Great [genre] track."
- **Previously Heard**: "Oh, [Song] by [Artist] again! I remember we heard this before."
- **Genre-Based**: "Interesting choice - [Artist] has a unique [genre] style."

The commentary adapts to each PersonI's personality:
- **NIRVANA**: Calm, observational comments
- **ATHENA**: Analytical, knowledge-focused observations
- **THEO**: Enthusiastic, energetic reactions
- **ADAM**: Technical, detail-oriented comments
- **GHOST**: Mysterious, atmospheric observations

## Architecture

### Components

#### SongIdentificationService
- Location: `src/services/song-identification-service.ts`
- Responsibilities:
  - Audio capture coordination
  - API integration
  - State management
  - Event dispatching

#### SongInfoBubble
- Location: `src/components/song-info-bubble.ts`
- Responsibilities:
  - UI rendering
  - Lyrics display
  - User interactions
  - Animations

#### Integration Points
- **MusicDetector**: Triggers identification on music detection
- **SharedMicrophoneManager**: Provides audio capture
- **RAG Memory**: Stores song history
- **Provider System**: Generates PersonI commentary

### Event Flow

```
Music Playing
    ↓
MusicDetector detects music
    ↓
Fires 'musicstart' event
    ↓
SongIdentificationService schedules capture (7s delay)
    ↓
Captures 10 seconds of audio
    ↓
Sends to identification API
    ↓
Fires 'identified' event with song info
    ↓
Fetches lyrics (if enabled)
    ↓
Fires 'lyricsfetched' event
    ↓
Shows bubble UI
    ↓
Generates PersonI commentary
    ↓
Stores in RAG memory
```

### Memory Storage

Identified songs are stored in RAG memory with:

```javascript
{
  text: 'Heard song: "Title" by Artist from album "Album" (Year), genre: Genre',
  type: 'song_identification',
  metadata: {
    songTitle: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 2024,
    genre: 'Rock',
    identifiedAt: 1234567890000
  }
}
```

This allows PersonI to:
- Reference songs heard in the past
- Understand user's music preferences
- Make contextual comments about repeated songs
- Build a music listening history

## Troubleshooting

### Song Not Identified

**Symptoms**: Music is detected but no song info appears

**Solutions**:
1. Check API keys are configured correctly
2. Verify API quota hasn't been exceeded
3. Ensure audio quality is sufficient (not too quiet or distorted)
4. Check browser console for API errors
5. Try increasing the capture duration

### Bubble Not Showing

**Symptoms**: Song is identified but bubble doesn't appear

**Solutions**:
1. Check `showBubble` config is `true`
2. Verify `songIdentificationEnabled` is `true`
3. Check for CSS/styling conflicts
4. Look for JavaScript errors in console

### PersonI Not Commenting

**Symptoms**: Song identified but no commentary

**Solutions**:
1. Check `personiCommentary` config is `true`
2. Verify PersonI is not currently speaking
3. Ensure provider is configured correctly
4. Check that PersonI is active and not muted

### Lyrics Not Displaying

**Symptoms**: Song identified but no lyrics shown

**Solutions**:
1. Check `fetchLyrics` config is `true`
2. Verify Genius API key is configured
3. Some songs may not have lyrics available
4. Check console for lyrics API errors

### High API Usage

**Symptoms**: Running out of API quota quickly

**Solutions**:
1. Increase `identificationDelayMs` to avoid false triggers
2. Adjust MusicDetector sensitivity to reduce false positives
3. Consider implementing local caching
4. Use `autoIdentify: false` and trigger manually

## Best Practices

### API Usage Optimization

1. **Increase Delay**: Set `identificationDelayMs` to 10-15 seconds for more accurate detection
2. **Adjust Sensitivity**: Fine-tune MusicDetector to avoid false positives
3. **Cache Results**: Service automatically caches identified songs
4. **Manual Trigger**: Consider disabling auto-identify for heavy users

### User Experience

1. **Position Bubble**: Top-right position doesn't interfere with main UI
2. **Auto-Hide**: 5-second delay before hiding gives users time to see info
3. **Minimize Option**: Users can keep song info visible without taking space
4. **External Links**: Quick access to streaming services

### Performance

1. **Shared Microphone**: Uses SharedMicrophoneManager for efficient audio access
2. **Event-Driven**: No polling, events trigger only when needed
3. **Lazy Loading**: Lyrics fetched only after identification
4. **Memory Efficient**: Audio buffer cleared after identification

## Future Enhancements

### Planned Features

- [ ] ACRCloud API integration
- [ ] Musixmatch lyrics integration
- [ ] Configuration UI in settings panel
- [ ] Local fingerprinting (offline identification)
- [ ] Song history panel
- [ ] Playlist generation from heard songs
- [ ] Music recommendations from PersonI
- [ ] Export song history
- [ ] Multiple language lyrics support
- [ ] Karaoke mode with highlighted lyrics
- [ ] Shazam API integration

### Advanced Use Cases

1. **Music Discovery**: PersonI learns your music taste
2. **Party Mode**: Track all songs played at an event
3. **Study Sessions**: Log background music for productivity analysis
4. **Podcast Segments**: Identify music in podcasts
5. **Live Concerts**: Remember songs from live performances

## API Reference

### SongIdentificationService

```typescript
// Initialize service
await songIdentificationService.initialize();

// Update configuration
songIdentificationService.updateConfig({
  enabled: true,
  apiProvider: 'audd',
  fetchLyrics: true,
  personiCommentary: true
});

// Get current configuration
const config = songIdentificationService.getConfig();

// Start manual capture
songIdentificationService.startCapture();

// Get current song
const song = songIdentificationService.getCurrentSong();

// Get current lyrics
const lyrics = songIdentificationService.getCurrentLyrics();

// Clear current state
songIdentificationService.clearCurrent();

// Cleanup
songIdentificationService.cleanup();
```

### Events

```typescript
// Song identified
songIdentificationService.addEventListener('identified', (event) => {
  const songInfo = event.detail;
  console.log(`Identified: ${songInfo.title} by ${songInfo.artist}`);
});

// Lyrics fetched
songIdentificationService.addEventListener('lyricsfetched', (event) => {
  const lyricsInfo = event.detail;
  console.log(`Lyrics from ${lyricsInfo.source}`);
});

// Identification started
songIdentificationService.addEventListener('identificationstart', () => {
  console.log('Identifying song...');
});

// Identification failed
songIdentificationService.addEventListener('identificationfailed', () => {
  console.log('Failed to identify song');
});

// State cleared
songIdentificationService.addEventListener('cleared', () => {
  console.log('Song info cleared');
});
```

## Support

For issues, feature requests, or contributions, please refer to the main project documentation.
