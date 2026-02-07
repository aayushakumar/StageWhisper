// ============================================================================
// StageWhisper - Content Script (Overlay Injection)
// Injects teleprompter overlay into the current page
// Self-contained with no external imports
// ============================================================================

// Prevent duplicate injection
if ((window as unknown as { __stagewhisper_injected?: boolean }).__stagewhisper_injected) {
  console.log('[StageWhisper Content] Already injected, skipping');
} else {
  (window as unknown as { __stagewhisper_injected?: boolean }).__stagewhisper_injected = true;

  // ============================================================================
  // Inlined Types (from @shared/types)
  // ============================================================================

  interface PlaybackState {
    playing: boolean;
    speed: number;
    position: number;
    currentLine: number;
    totalLines: number;
    estimatedTimeRemaining: number;
  }

  interface Script {
    id: string;
    title: string;
    body: string;
    createdAt: number;
    updatedAt: number;
    folderId?: string;
  }

  interface Message {
    type: string;
    timestamp: number;
    [key: string]: unknown;
  }

  // ============================================================================
  // Inlined Theme (from @shared/designTokens)
  // ============================================================================

  const theme = {
    background: 'rgba(18, 18, 18, 0.85)',
    surface: 'rgba(30, 30, 30, 0.9)',
    surfaceHover: 'rgba(45, 45, 45, 0.9)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: 'rgba(255, 255, 255, 0.95)',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    blur: '20px',
  };

  // ============================================================================
  // State
  // ============================================================================

  interface OverlayState {
    scriptId: string;
    script: Script | null;
    playbackState: PlaybackState;
    hidden: boolean;
    container: HTMLElement | null;
    shadowRoot: ShadowRoot | null;
    processedMessages: Set<number>; // Track processed message timestamps
  }

  const state: OverlayState = {
    scriptId: '',
    script: null,
    playbackState: {
      playing: false,
      speed: 150,
      position: 0,
      currentLine: 0,
      totalLines: 0,
      estimatedTimeRemaining: 0,
    },
    hidden: false,
    container: null,
    shadowRoot: null,
    processedMessages: new Set(),
  };

  // ============================================================================
  // Initialization
  // ============================================================================

  function init() {
    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleMessage);

    console.log('[StageWhisper Content] Content script loaded and ready');
  }

  function handleMessage(
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    // Deduplicate messages by timestamp to prevent double-processing
    const timestamp = message.timestamp;
    if (timestamp && state.processedMessages.has(timestamp)) {
      console.log('[StageWhisper Content] Skipping duplicate message:', message.type);
      sendResponse({ success: true, duplicate: true });
      return false;
    }

    if (timestamp) {
      state.processedMessages.add(timestamp);
      // Clean up old timestamps (keep last 10 to prevent memory leak)
      if (state.processedMessages.size > 10) {
        const arr = Array.from(state.processedMessages);
        state.processedMessages = new Set(arr.slice(-10));
      }
    }

    console.log('[StageWhisper Content] Processing message:', message.type);

    // Cast to unknown first to allow type narrowing
    const msg = message as unknown as Record<string, unknown>;

    switch (message.type) {
      case 'SESSION_START':
        const session = (msg.session as { scriptId: string });
        console.log('[StageWhisper Content] Handling SESSION_START for script:', session.scriptId);
        handleSessionStart(session.scriptId)
          .then(() => {
            console.log('[StageWhisper Content] SESSION_START completed successfully');
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error('[StageWhisper Content] SESSION_START error:', error);
            sendResponse({ success: false, error: String(error) });
          });
        return true; // Keep channel open for async response

      case 'COMMAND':
        handleCommand(msg.command as string);
        sendResponse({ success: true });
        return false;

      case 'PANIC_HIDE':
        handlePanicHide(msg.hidden as boolean);
        sendResponse({ success: true });
        return false;

      case 'SCRIPT_UPDATE':
        const script = msg.script as Script;
        if (script.id === state.scriptId) {
          state.script = script;
          renderScript();
        }
        sendResponse({ success: true });
        return false;
    }

    return false;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async function handleSessionStart(scriptId: string) {
    state.scriptId = scriptId;

    // Load script and settings from storage
    const data = await chrome.storage.local.get(['scripts', 'settings']);
    const scripts: Script[] = data.scripts || [];
    state.script = scripts.find((s) => s.id === scriptId) || null;

    // Apply user settings if available
    if (data.settings) {
      const settings = data.settings;
      if (settings.defaultSpeedWpm) {
        state.playbackState.speed = settings.defaultSpeedWpm;
      }
    }

    if (!state.script) {
      console.error('[StageWhisper Content] Script not found:', scriptId);
      return;
    }

    console.log('[StageWhisper Content] Script loaded:', state.script.title, 'Speed:', state.playbackState.speed);

    // Create overlay if not exists
    if (!state.container) {
      createOverlay();
    }

    // Update speed display to match settings
    if (state.shadowRoot) {
      const wpmEl = state.shadowRoot.querySelector('.sw-wpm') as HTMLElement;
      if (wpmEl) {
        wpmEl.textContent = `${state.playbackState.speed} WPM`;
      }
    }

    renderScript();
    showOverlay();
  }

  function handleCommand(command: string) {
    console.log('[StageWhisper Content] handleCommand:', command, 'playing:', state.playbackState.playing);
    switch (command) {
      case 'play':
        startPlayback();
        break;
      case 'pause':
        pausePlayback();
        break;
      case 'toggle_play':
        console.log('[StageWhisper Content] toggle_play - currently playing:', state.playbackState.playing);
        if (state.playbackState.playing) {
          pausePlayback();
        } else {
          startPlayback();
        }
        break;
      case 'hide':
        hideOverlay();
        break;
      case 'show':
        showOverlay();
        break;
      case 'toggle_hide':
        handlePanicHide(!state.hidden);
        break;
      case 'rewind':
        rewind();
        break;
      case 'forward':
        forward();
        break;
    }
  }

  function handlePanicHide(hidden: boolean) {
    state.hidden = hidden;
    if (state.container) {
      state.container.style.display = hidden ? 'none' : 'block';
    }
  }

  // ============================================================================
  // Overlay Creation
  // ============================================================================

  function createOverlay() {
    // Create host element
    const host = document.createElement('div');
    host.id = 'stagewhisper-overlay';
    host.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    pointer-events: none;
  `;

    // Create shadow root for isolation
    const shadow = host.attachShadow({ mode: 'closed' });

    // Inject styles
    const styles = document.createElement('style');
    styles.textContent = getOverlayStyles();
    shadow.appendChild(styles);

    // Create overlay container
    const container = document.createElement('div');
    container.className = 'sw-overlay';
    shadow.appendChild(container);

    // Create inner structure with enhanced controls
    container.innerHTML = `
    <div class="sw-header">
      <div class="sw-controls">
        <button class="sw-btn sw-rewind" aria-label="Rewind" title="Rewind (Alt+Left)">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8 6 8 6zm.5-6l8 6V6l-8 6z"/>
          </svg>
        </button>
        <button class="sw-btn sw-play" aria-label="Play/Pause" title="Play/Pause (Alt+P)">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path class="play-icon" d="M8 5v14l11-7z" />
            <path class="pause-icon" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>
        <button class="sw-btn sw-forward" aria-label="Forward" title="Forward">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 18l8-6-8-6v12zm.5-6l8 6V6l-8 6z" transform="rotate(180 12 12)"/>
          </svg>
        </button>
      </div>
      <div class="sw-speed">
        <button class="sw-btn sw-speed-down" aria-label="Slower" title="Slower">−</button>
        <span class="sw-wpm">150 WPM</span>
        <button class="sw-btn sw-speed-up" aria-label="Faster" title="Faster">+</button>
      </div>
      <div class="sw-info">
        <span class="sw-time">--:--</span>
        <span class="sw-progress-text">0%</span>
      </div>
      <div class="sw-actions">
        <button class="sw-btn sw-minimize" aria-label="Minimize" title="Hide (Alt+H)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <button class="sw-btn sw-close" aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div class="sw-progress-bar">
      <div class="sw-progress-fill"></div>
    </div>
    <div class="sw-content">
      <div class="sw-text"></div>
    </div>
  `;

    // Event listeners (with pointer-events enabled)
    container.style.pointerEvents = 'auto';

    // Play/Pause
    const playBtn = container.querySelector('.sw-play') as HTMLButtonElement;
    console.log('[StageWhisper Content] Play button found:', !!playBtn);
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[StageWhisper Content] Play button CLICKED');
        handleCommand('toggle_play');
      });
    }

    // Rewind/Forward
    const rewindBtn = container.querySelector('.sw-rewind') as HTMLButtonElement;
    if (rewindBtn) {
      rewindBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCommand('rewind');
      });
    }

    const forwardBtn = container.querySelector('.sw-forward') as HTMLButtonElement;
    if (forwardBtn) {
      forwardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCommand('forward');
      });
    }

    // Speed controls
    const speedDownBtn = container.querySelector('.sw-speed-down') as HTMLButtonElement;
    if (speedDownBtn) {
      speedDownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        adjustSpeed(-10);
      });
    }

    const speedUpBtn = container.querySelector('.sw-speed-up') as HTMLButtonElement;
    if (speedUpBtn) {
      speedUpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        adjustSpeed(10);
      });
    }

    // Minimize/Close
    const minimizeBtn = container.querySelector('.sw-minimize') as HTMLButtonElement;
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCommand('toggle_hide');
      });
    }

    const closeBtn = container.querySelector('.sw-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideOverlay();
        cleanup();
      });
    }

    // Drag functionality
    setupDrag(container, host);

    document.body.appendChild(host);

    state.container = host;
    state.shadowRoot = shadow;
  }

  function adjustSpeed(delta: number) {
    const newSpeed = Math.max(50, Math.min(400, state.playbackState.speed + delta));
    state.playbackState.speed = newSpeed;

    // Update WPM display
    if (state.shadowRoot) {
      const wpmEl = state.shadowRoot.querySelector('.sw-wpm') as HTMLElement;
      if (wpmEl) {
        wpmEl.textContent = `${newSpeed} WPM`;
      }
    }

    // Restart playback with new speed if playing
    if (state.playbackState.playing) {
      pausePlayback();
      startPlayback();
    }
  }

  function getOverlayStyles(): string {
    return `
    .sw-overlay {
      width: 600px;
      background: ${theme.background};
      backdrop-filter: blur(${theme.blur});
      -webkit-backdrop-filter: blur(${theme.blur});
      border: 1px solid ${theme.border};
      border-radius: 16px;
      overflow: hidden;
      font-family: 'SF Pro Display', 'Inter', system-ui, sans-serif;
      color: ${theme.text};
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .sw-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: ${theme.surface};
      border-bottom: 1px solid ${theme.border};
      gap: 12px;
      cursor: move;
    }

    .sw-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sw-speed {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sw-wpm {
      font-size: 11px;
      color: ${theme.textMuted};
      font-variant-numeric: tabular-nums;
      min-width: 60px;
      text-align: center;
    }

    .sw-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sw-time {
      font-size: 12px;
      color: ${theme.textMuted};
      font-variant-numeric: tabular-nums;
    }

    .sw-progress-text {
      font-size: 11px;
      color: ${theme.textMuted};
      opacity: 0.8;
    }

    .sw-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sw-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: ${theme.text};
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 14px;
      font-weight: 500;
    }

    .sw-btn:hover {
      background: ${theme.surfaceHover};
      transform: scale(1.05);
    }

    .sw-btn:active {
      transform: scale(0.95);
    }

    .sw-btn svg {
      width: 16px;
      height: 16px;
    }

    .sw-play {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
    }

    .sw-play svg {
      width: 18px;
      height: 18px;
    }

    .sw-progress-bar {
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
    }

    .sw-progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8));
      transition: width 0.3s ease;
    }

    .sw-content {
      padding: 16px 20px;
      max-height: 200px;
      overflow: hidden;
    }

    .sw-text {
      font-size: 24px;
      line-height: 1.5;
      transition: transform 0.15s ease-out;
    }

    .sw-text .current-line {
      color: ${theme.text};
      font-weight: 500;
    }

    .sw-text .next-line {
      color: ${theme.textMuted};
      opacity: 0.6;
    }

    .sw-text .past-line {
      color: ${theme.textMuted};
      opacity: 0.3;
    }

    /* Play/Pause icon switching */
    .sw-overlay .pause-icon { display: none; }
    .sw-overlay .play-icon { display: block; }
    .sw-overlay.playing .play-icon { display: none; }
    .sw-overlay.playing .pause-icon { display: block; }

    /* Keyboard shortcut hint on hover */
    .sw-btn[title]:hover::after {
      content: attr(title);
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      white-space: nowrap;
      background: rgba(0, 0, 0, 0.8);
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
    }
  `;
  }

  // ============================================================================
  // Drag & Drop
  // ============================================================================

  function setupDrag(container: HTMLElement, host: HTMLElement) {
    const header = container.querySelector('.sw-header') as HTMLElement;
    if (!header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.sw-btn')) return;

      isDragging = true;
      const rect = host.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      offsetX = rect.left + rect.width / 2;
      offsetY = rect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      host.style.left = `${offsetX + dx}px`;
      host.style.top = `${offsetY + dy}px`;
      host.style.transform = 'none';
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  function renderScript() {
    if (!state.script || !state.shadowRoot) return;

    const textEl = state.shadowRoot.querySelector('.sw-text') as HTMLElement;
    if (!textEl) return;

    const lines = state.script.body.split('\n').filter((l) => l.trim());
    state.playbackState.totalLines = lines.length;

    const currentLine = state.playbackState.currentLine;

    // Render 3 lines: previous, current, next
    const html = lines
      .slice(Math.max(0, currentLine - 1), currentLine + 3)
      .map((line, i) => {
        const actualIndex = Math.max(0, currentLine - 1) + i;
        let className = 'next-line';

        if (actualIndex < currentLine) {
          className = 'past-line';
        } else if (actualIndex === currentLine) {
          className = 'current-line';
        }

        return `<div class="${className}">${escapeHtml(line)}</div>`;
      })
      .join('');

    textEl.innerHTML = html;

    // Update time
    updateTimeDisplay();
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateTimeDisplay() {
    if (!state.shadowRoot || !state.script) return;

    const timeEl = state.shadowRoot.querySelector('.sw-time') as HTMLElement;
    const progressFill = state.shadowRoot.querySelector('.sw-progress-fill') as HTMLElement;
    const progressText = state.shadowRoot.querySelector('.sw-progress-text') as HTMLElement;

    const wordCount = state.script.body.split(/\s+/).filter(Boolean).length;
    const wordsPerMin = state.playbackState.speed;
    const totalSeconds = Math.ceil((wordCount / wordsPerMin) * 60);

    const currentLine = state.playbackState.currentLine;
    const totalLines = state.playbackState.totalLines;
    const progress = totalLines > 0 ? currentLine / totalLines : 0;
    const remainingSeconds = Math.ceil(totalSeconds * (1 - progress));

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    // Update time remaining
    if (timeEl) {
      timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Update progress bar
    if (progressFill) {
      progressFill.style.width = `${Math.round(progress * 100)}%`;
    }

    // Update progress percentage
    if (progressText) {
      progressText.textContent = `${Math.round(progress * 100)}%`;
    }
  }

  // ============================================================================
  // Playback
  // ============================================================================

  let playbackInterval: number | null = null;

  function startPlayback() {
    console.log('[StageWhisper Content] startPlayback called, currently playing:', state.playbackState.playing);
    if (state.playbackState.playing) return;

    state.playbackState.playing = true;
    updatePlayingState();

    // Calculate line duration from WPM
    // Assuming ~10 words per line average
    const wordsPerLine = 10;
    const linesPerMin = state.playbackState.speed / wordsPerLine;
    const msPerLine = (60 / linesPerMin) * 1000;

    console.log('[StageWhisper Content] Starting playback: speed=', state.playbackState.speed, 'WPM, msPerLine=', msPerLine);

    playbackInterval = window.setInterval(() => {
      if (state.playbackState.currentLine < state.playbackState.totalLines - 1) {
        state.playbackState.currentLine++;
        console.log('[StageWhisper Content] Advanced to line:', state.playbackState.currentLine, '/', state.playbackState.totalLines);
        renderScript();
      } else {
        console.log('[StageWhisper Content] Playback complete');
        pausePlayback();
      }
    }, msPerLine);

    console.log('[StageWhisper Content] Interval started with ID:', playbackInterval);
  }

  function pausePlayback() {
    state.playbackState.playing = false;
    updatePlayingState();

    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
    }
  }

  function rewind() {
    const rewindLines = 2; // Default beat rewind
    state.playbackState.currentLine = Math.max(0, state.playbackState.currentLine - rewindLines);
    renderScript();
  }

  function forward() {
    state.playbackState.currentLine = Math.min(
      state.playbackState.totalLines - 1,
      state.playbackState.currentLine + 2
    );
    renderScript();
  }

  function updatePlayingState() {
    if (!state.shadowRoot) return;

    const overlay = state.shadowRoot.querySelector('.sw-overlay') as HTMLElement;
    if (overlay) {
      overlay.classList.toggle('playing', state.playbackState.playing);
    }
  }

  // ============================================================================
  // Show / Hide
  // ============================================================================

  function showOverlay() {
    state.hidden = false;
    if (state.container) {
      state.container.style.display = 'block';
    }
  }

  function hideOverlay() {
    state.hidden = true;
    if (state.container) {
      state.container.style.display = 'none';
    }
  }

  function cleanup() {
    pausePlayback();

    if (state.container) {
      state.container.remove();
      state.container = null;
      state.shadowRoot = null;
    }

    state.script = null;
    state.scriptId = '';
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  init();

} // End of injection guard else block
