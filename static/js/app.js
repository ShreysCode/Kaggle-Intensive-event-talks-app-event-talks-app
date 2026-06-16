// BigQuery Release Pulse Client-side App

// State Management
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const syncStatusText = document.getElementById('sync-status');
const searchInput = document.getElementById('search-input');
const filterChips = document.querySelectorAll('.filter-chip');
const releaseFeed = document.getElementById('release-feed');

// Stats Counters
const valTotal = document.getElementById('val-total');
const valFeatures = document.getElementById('val-features');
const valIssues = document.getElementById('val-issues');
const valOthers = document.getElementById('val-others');

// Composer Elements
const composerUnselected = document.getElementById('composer-unselected');
const composerActive = document.getElementById('composer-active');
const selectedDateSpan = document.getElementById('selected-date');
const selectedBadgeSpan = document.getElementById('selected-badge');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const previewBody = document.getElementById('preview-body');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');

// Container positions for responsive composer
const composerSidebar = document.getElementById('composer-sidebar');
const mobileComposerDialog = document.getElementById('mobile-composer-dialog');
const mobileDialogBody = document.getElementById('mobile-dialog-body');
const dialogCloseBtn = document.getElementById('dialog-close-btn');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupDialogPolyfill();
  fetchReleases(false); // Fetch on load, use cache
});

// Event Listeners
function setupEventListeners() {
  // Refresh Button
  refreshBtn.addEventListener('click', () => {
    fetchReleases(true); // Force fetch, bypass cache
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    filterAndRender();
  });

  // Category Filters
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategoryFilter = chip.dataset.category;
      filterAndRender();
    });
  });

  // Tweet composer text input
  tweetTextarea.addEventListener('input', handleTweetTextareaInput);

  // Copy Draft Action
  copyTweetBtn.addEventListener('click', copyDraft);

  // Tweet Send Action
  tweetBtn.addEventListener('click', tweetIt);

  // Dialog Close Button
  dialogCloseBtn.addEventListener('click', () => {
    mobileComposerDialog.close();
  });

  // Watch for window resize to move composer panel if necessary
  window.addEventListener('resize', handleResponsiveComposerPosition);
}

// Fallback click-dismiss support for Dialog element (Safari compat)
function setupDialogPolyfill() {
  if (!mobileComposerDialog) return;
  
  // Close dialog on backdrop click if browser doesn't natively support closedby="any"
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    mobileComposerDialog.addEventListener('click', (event) => {
      if (event.target !== mobileComposerDialog) return;
      
      const rect = mobileComposerDialog.getBoundingClientRect();
      const isInsideContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      
      if (!isInsideContent) {
        mobileComposerDialog.close();
      }
    });
  }

  // Prevent background scrolling when modal is open
  mobileComposerDialog.addEventListener('close', () => {
    document.body.style.overflow = '';
  });
}

// Fetch Release Notes
async function fetchReleases(force = false) {
  setLoadingState(true);
  try {
    const url = `/api/releases${force ? '?force=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'success') {
      allUpdates = data.updates;
      
      // Update Sync Status Text
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (data.from_cache) {
        syncStatusText.textContent = `Cached updates loaded at ${timeStr}`;
      } else {
        syncStatusText.textContent = `Synced fresh updates at ${timeStr}`;
        showToast("Feed refreshed successfully!");
      }
      
      updateStats();
      filterAndRender();
    } else {
      syncStatusText.textContent = 'Failed to sync updates';
      showToast(`Error: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error fetching release notes:", error);
    syncStatusText.textContent = 'Sync failed';
    showToast("Network error. Please try again later.");
  } finally {
    setLoadingState(false);
  }
}

// Set Loading UI State
function setLoadingState(isLoading) {
  if (isLoading) {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    
    // Show skeleton loaders in the feed
    releaseFeed.innerHTML = `
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    `;
  } else {
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
  }
}

// Update Dashboard Statistics
function updateStats() {
  const total = allUpdates.length;
  const features = allUpdates.filter(u => u.category.toLowerCase() === 'feature').length;
  const issues = allUpdates.filter(u => u.category.toLowerCase() === 'issue').length;
  const others = total - (features + issues);
  
  valTotal.textContent = total;
  valFeatures.textContent = features;
  valIssues.textContent = issues;
  valOthers.textContent = others;
}

// Filter and Render updates
function filterAndRender() {
  filteredUpdates = allUpdates.filter(update => {
    // Category filter
    const cat = update.category.toLowerCase();
    let matchesCategory = false;
    
    if (currentCategoryFilter === 'all') {
      matchesCategory = true;
    } else if (currentCategoryFilter === 'feature') {
      matchesCategory = cat === 'feature';
    } else if (currentCategoryFilter === 'issue') {
      matchesCategory = cat === 'issue';
    } else {
      // 'other' includes deprecated, changed, or general update
      matchesCategory = cat !== 'feature' && cat !== 'issue';
    }
    
    // Search text filter
    const matchesSearch = !currentSearchQuery || 
                          update.description_text.toLowerCase().includes(currentSearchQuery) ||
                          update.date.toLowerCase().includes(currentSearchQuery) ||
                          update.category.toLowerCase().includes(currentSearchQuery);
                          
    return matchesCategory && matchesSearch;
  });
  
  renderFeed();
}

// Render the Feed list
function renderFeed() {
  if (filteredUpdates.length === 0) {
    releaseFeed.innerHTML = `
      <div class="feed-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No release notes found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  releaseFeed.innerHTML = '';
  
  filteredUpdates.forEach(update => {
    const card = document.createElement('div');
    card.className = `release-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
    card.dataset.id = update.id;
    
    // Determine category badge class
    let badgeClass = 'badge-other';
    const cat = update.category.toLowerCase();
    if (cat === 'feature') badgeClass = 'badge-feature';
    else if (cat === 'issue') badgeClass = 'badge-issue';
    else if (cat === 'deprecated') badgeClass = 'badge-deprecated';
    else if (cat === 'changed') badgeClass = 'badge-changed';
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-date-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>${update.date}</span>
        </div>
        <span class="badge ${badgeClass}">${update.category}</span>
      </div>
      <div class="card-content">
        ${update.description_html}
      </div>
      <div class="card-footer">
        <a href="${update.link}" target="_blank" class="card-action-btn" onclick="event.stopPropagation();">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span>Docs</span>
        </a>
        <button class="card-action-btn btn-tweet-card">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
          <span>Tweet</span>
        </button>
      </div>
    `;
    
    // Select card on click
    card.addEventListener('click', (e) => {
      // If they clicked the Tweet button inside the footer, handle it immediately
      const isTweetBtn = e.target.closest('.btn-tweet-card');
      selectCard(update);
      
      if (isTweetBtn || window.innerWidth <= 992) {
        openMobileComposer();
      }
    });
    
    releaseFeed.appendChild(card);
  });
}

// Select a release card
function selectCard(update) {
  selectedUpdate = update;
  
  // Highlight card in feed
  const cards = releaseFeed.querySelectorAll('.release-card');
  cards.forEach(card => {
    if (card.dataset.id === update.id) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // Update Composer Content
  composerUnselected.classList.add('hidden');
  composerActive.classList.remove('hidden');
  
  selectedDateSpan.textContent = update.date;
  selectedBadgeSpan.textContent = update.category;
  
  // Reset badge class in composer
  selectedBadgeSpan.className = 'badge';
  const cat = update.category.toLowerCase();
  if (cat === 'feature') selectedBadgeSpan.classList.add('badge-feature');
  else if (cat === 'issue') selectedBadgeSpan.classList.add('badge-issue');
  else if (cat === 'deprecated') selectedBadgeSpan.classList.add('badge-deprecated');
  else if (cat === 'changed') selectedBadgeSpan.classList.add('badge-changed');
  else selectedBadgeSpan.classList.add('badge-other');
  
  // Generate default tweet text
  const defaultText = generateDefaultTweet(update);
  tweetTextarea.value = defaultText;
  
  // Trigger input handler to sync character counter and preview
  handleTweetTextareaInput();
}

// Generate Default Tweet Text
function generateDefaultTweet(update) {
  const header = `BigQuery ${update.category} (${update.date}): `;
  const tags = ` #BigQuery #GoogleCloud`;
  const twitterUrlLength = 23; // Twitter counts all URLs as 23 characters
  
  // Maximum text length before the URL is appended
  // Text + Space + URL <= 280
  // Text <= 280 - 23 - 1 = 256
  const maxTextLength = 256;
  const availableLength = maxTextLength - header.length - tags.length;
  
  let desc = update.description_text;
  if (desc.length > availableLength) {
    desc = desc.substring(0, availableLength - 3) + '...';
  }
  
  return `${header}${desc}${tags}`;
}

// Handle character count, warning colors, and card preview rendering
function handleTweetTextareaInput() {
  const text = tweetTextarea.value;
  const count = text.length;
  
  // Update counter
  charCounter.textContent = `${count} / 280`;
  
  if (count > 280) {
    charCounter.classList.add('warning');
    tweetBtn.disabled = true;
  } else {
    charCounter.classList.remove('warning');
    tweetBtn.disabled = false;
  }
  
  // Update Live Preview text
  previewBody.textContent = text || 'Draft text preview...';
}

// Open mobile drawer
function openMobileComposer() {
  if (window.innerWidth <= 992) {
    // Move active composer content into dialog body
    const composerNode = document.querySelector('.composer-container');
    if (composerNode && mobileDialogBody.children.length === 0) {
      mobileDialogBody.appendChild(composerNode);
    }
    
    // Open Dialog modal
    document.body.style.overflow = 'hidden';
    mobileComposerDialog.showModal();
  }
}

// Handle layout restructuring on screen resize
function handleResponsiveComposerPosition() {
  const isMobile = window.innerWidth <= 992;
  const composerNode = document.querySelector('.composer-container');
  
  if (!composerNode) return;
  
  if (isMobile) {
    // If modal is open, keep it there. If not open, keep in sidebar but hide.
    // In CSS, .composer-sidebar is display: none.
    // When opening composer, we append it to dialog.
    if (!mobileComposerDialog.open && mobileDialogBody.children.length > 0) {
      // Move back to sidebar if dialog is closed
      composerSidebar.appendChild(composerNode);
    }
  } else {
    // On desktop, make sure composer is back in sidebar, and close dialog
    if (mobileComposerDialog.open) {
      mobileComposerDialog.close();
    }
    if (composerSidebar.children.length === 0) {
      composerSidebar.appendChild(composerNode);
    }
  }
}

// Copy Tweet Text to Clipboard
function copyDraft() {
  const text = tweetTextarea.value;
  if (!text) return;
  
  // Append link to copy output as well
  const fullContent = `${text}\n\n${selectedUpdate.link}`;
  
  navigator.clipboard.writeText(fullContent).then(() => {
    showToast("Tweet draft & link copied to clipboard!");
  }).catch(err => {
    console.error("Could not copy text: ", err);
    showToast("Failed to copy. Please copy text manually.");
  });
}

// Send Tweet to Twitter (Intent URL)
function tweetIt() {
  const text = tweetTextarea.value;
  if (!text) return;
  
  if (text.length > 280) {
    showToast("Draft exceeds character limit of 280!");
    return;
  }
  
  // Generate Twitter Web Intent URL
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(selectedUpdate.link)}`;
  
  // Open in new tab
  window.open(tweetUrl, '_blank', 'noopener,noreferrer');
}

// Custom Toast message
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  // Clear previous timers if any
  if (window.toastTimer) {
    clearTimeout(window.toastTimer);
  }
  
  window.toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}
