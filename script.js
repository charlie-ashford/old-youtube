let currentPage = 1;
let itemsPerPage = 48;
let searchQuery = '';

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get('page'));
  const query = params.get('q');

  if (!isNaN(page) && page > 0) {
    currentPage = page;
  }

  if (query) {
    searchQuery = query;
    document.getElementById('search-input').value = searchQuery;
  }
}

function updateUrl() {
  const url = new URL(window.location);
  url.searchParams.set('page', currentPage);
  url.searchParams.set('q', searchQuery);
  history.pushState({}, '', url);
}

function calculateRating(channel) {
  const subscribers = parseInt(channel.subscriberCount || '0');
  const views = parseInt(channel.viewCount || '0');
  const videoCount = parseInt(channel.videoCount || '0');
  const maxRating = 5;
  
  if (views === 0 || videoCount === 0 || subscribers === 0) return 0;
  
  const viewsPerVideo = views / videoCount;
  const viewsPerSub = views / subscribers;
  
  const engagement = Math.min(1, Math.log10(viewsPerVideo + 1) / 6);
  
  const reach = Math.min(1, Math.log10(viewsPerSub + 1) / 2);
  
  const growth = Math.min(1, Math.log10(subscribers / videoCount + 1) / 4);
  let rating = (engagement * 0.4) + (reach * 0.35) + (growth * 0.25);
  
  rating = rating * maxRating;
  rating = Math.max(0, Math.min(maxRating, rating));
  
  return rating;
}

function generateStars(rating) {
  const fullStars = Math.floor(rating);
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
}

function formatSubscriberCount(count) {
  return parseInt(count).toLocaleString('en-US');
}

function formatTotalViews(totalViews) {
  return parseInt(totalViews).toLocaleString('en-US');
}

function formatVideoCount(videoCount) {
  return parseInt(videoCount).toLocaleString('en-US');
}

function formatDate(dateString) {
  return luxon.DateTime.fromISO(dateString, { zone: 'utc' }).toFormat(
    'MMMM d, yyyy'
  );
}

let allChannels = [];

async function fetchChannels(page, query = '') {
  const container = document.getElementById('channels-container');
  container.innerHTML = '<div class="loading">Loading channels...</div>';

  try {
    const response = await fetch(
      `https://api.communitrics.com/api/channels?page=${page}&query=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();

    displayChannels(data.channels);
    updatePagination(data.totalPages, data.currentPage);
    updateUrl();
  } catch (error) {
    container.innerHTML = '<div class="loading">Error loading channels</div>';
  }
}

async function fetchData2() {
  try {
    const responseData2 = await fetch('https://api.communitrics.com/api/all');
    const data2 = await responseData2.json();

    updateChannelCount(data2.channels.length.toLocaleString('en-US'));
  } catch (error) {}
}

function updateChannelCount(count) {
  document.getElementById(
    'channel-count'
  ).innerHTML = `Number of Channels: <strong>${count}</strong>`;
}

async function searchChannels() {
  searchQuery = document.getElementById('search-input').value;
  currentPage = 1;
  await fetchChannels(currentPage, searchQuery);
}

function loadImageWithRetry(imgElement, url, fallbackUrl, retries = 2) {
  imgElement.src = url;

  imgElement.onerror = () => {
    if (retries > 0) {
      setTimeout(
        () => loadImageWithRetry(imgElement, url, fallbackUrl, retries - 1),
        10000
      );
    } else if (fallbackUrl) {
      imgElement.src = fallbackUrl;
    }
  };
}

function displayChannels(channels) {
  const container = document.getElementById('channels-container');
  container.innerHTML = '';

  channels.forEach(channel => {
    const channelBox = document.createElement('div');
    channelBox.className = 'channel-box';
    channelBox.onclick = () => showChannelDetails(channel);

    const rating = calculateRating(channel);
    const thumbnailUrl = channel.profilePicture || '';
    const subscriberCount = formatSubscriberCount(
      channel.subscriberCount || '0'
    );
    const videoCount = formatVideoCount(channel.videoCount || '0');
    const creationDate = formatDate(channel.publishedAt);

    let formattedRating =
      rating === 0
        ? '0'
        : rating.toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '');

    const subscriberText =
      subscriberCount === '1' ? 'subscriber' : 'subscribers';
    const videoText = videoCount === '1' ? 'video' : 'videos';

    channelBox.innerHTML = `
            <img class="channel-thumbnail" alt="${channel.title}">
            <div class="channel-title">${channel.title}</div>
            <div class="channel-stats">
                ${subscriberCount} ${subscriberText}<br>
                ${videoCount} ${videoText}
            </div>
            <div class="rating">
                Rating: ${formattedRating} <span class="stars">${generateStars(
      rating
    )}</span>
            </div>
            <div class="date-added">Joined: ${creationDate}</div>
        `;

    container.appendChild(channelBox);
    const imgElement = channelBox.querySelector('.channel-thumbnail');
    loadImageWithRetry(imgElement, thumbnailUrl, thumbnailUrl);
  });

  if (channels.length === 0) {
    container.innerHTML = '<div>No channels found.</div>';
  }
}

function showChannelDetails(channel) {
  const modal = document.getElementById('channel-modal');
  const modalContent = document.getElementById('modal-content-container');

  const subscriberCount = formatSubscriberCount(channel.subscriberCount || '0');
  const totalViews = formatTotalViews(channel.viewCount || '0');
  const videoCount = formatVideoCount(channel.videoCount || '0');
  const creationDate = formatDate(channel.publishedAt);

  const channelUrl =
    channel.url || `https://www.youtube.com/channel/${channel.id}`;

  modalContent.innerHTML = `
        <div class="modal-header">
            <img src="${channel.profilePicture || ''}" alt="${channel.title}">
            <div class="modal-header-content">
                <h2><a href="${channelUrl}" target="_blank">${
    channel.title
  }</a></h2> 
                ${
                  channel.handle
                    ? `<p><strong>Handle:</strong> ${channel.handle}</p>`
                    : ''
                }
                <p><strong>Subscribers:</strong> ${subscriberCount}</p>
                <p><strong>Total Views:</strong> ${totalViews}</p> 
                <p><strong>Videos:</strong> ${videoCount}</p>
                <p><strong>Created:</strong> ${creationDate}</p>
            </div>
        </div>
        <div class="modal-description">
            <p>${channel.description || 'No description available.'}</p>
        </div>
        <h3>Recent Videos</h3>
        <div id="recent-videos" class="video-grid">
            <p>Loading recent videos...</p>
        </div>
    `;

  modal.style.display = 'block';

  fetchRecentVideos(channel.id);
}

async function fetchRecentVideos(channelId) {
  try {
    const response = await fetch(
      `https://api.communitrics.com/api/channel/${channelId}/videos`
    );
    const videos = await response.json();
    displayRecentVideos(videos);
  } catch (error) {
    document.getElementById('recent-videos').innerHTML =
      'Error loading recent videos.';
  }
}

function displayRecentVideos(videos) {
  const recentVideosContainer = document.getElementById('recent-videos');
  recentVideosContainer.innerHTML = '';

  if (!videos || videos.length === 0) {
    recentVideosContainer.innerHTML = '<p>No recent videos found.</p>';
    return;
  }

  videos.forEach(video => {
    const videoElement = document.createElement('div');
    videoElement.className = 'video-item';
    const videoId = video.snippet.resourceId.videoId;
    const publishDate = formatDate(video.snippet.publishedAt);

    videoElement.innerHTML = `
            <img class="video-thumbnail" src="${
              video.snippet.thumbnails.medium.url || '/api/placeholder/120/90'
            }" alt="${video.snippet.title}">
            <div class="video-title"><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${
      video.snippet.title
    }</a></div>
            <div class="video-date">${publishDate}</div> 
        `;
    recentVideosContainer.appendChild(videoElement);
  });
}

function updatePagination(totalPages, currentPage) {
  const pagination = document.getElementById('pagination');
  let paginationHTML = 'Pages: ';

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  if (currentPage > 1) {
    paginationHTML += `<a href="#" onclick="changePage(${
      currentPage - 1
    }); return false">Previous</a> `;
  }

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (startPage > 1) {
    paginationHTML += `<a href="#" onclick="changePage(1); return false">1</a> `;
    if (startPage > 2) {
      paginationHTML += '... ';
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      paginationHTML += `<a href="#" class="active">${i}</a> `;
    } else {
      paginationHTML += `<a href="#" onclick="changePage(${i}); return false">${i}</a> `;
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '... ';
    }
    paginationHTML += `<a href="#" onclick="changePage(${totalPages}); return false">${totalPages}</a>`;
  }

  if (currentPage < totalPages) {
    paginationHTML += ` <a href="#" onclick="changePage(${
      currentPage + 1
    }); return false">Next</a>`;
  }

  pagination.innerHTML = paginationHTML;
}

async function changePage(page) {
  currentPage = page;
  await fetchChannels(currentPage, searchQuery);
}

function closeModal() {
  const modal = document.getElementById('channel-modal');
  modal.style.display = 'none';
}

function openSubmissionModal() {
  document.getElementById('submission-modal').style.display = 'block';
}

function closeSubmissionModal() {
  document.getElementById('submission-modal').style.display = 'none';
  document.getElementById('submission-result').innerText = '';
  document.getElementById('channel-url').value = '';
}

document
  .getElementById('channel-submission-form')
  .addEventListener('submit', async function (e) {
    e.preventDefault();
    const channelUrl = document.getElementById('channel-url').value;
    const submitButton = this.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('submission-result');

    submitButton.disabled = true;
    submitButton.innerText = 'Submitting...';
    resultDiv.innerText = '';

    try {
      const response = await fetch(
        'https://api.communitrics.com/api/submit-channel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channelUrl }),
        }
      );

      if (response.ok) {
        resultDiv.innerHTML = `<span style="color: green;">Channel submitted successfully!<br>The channel will be reviewed and added to the site soon.</span>`;
      } else {
        const result = await response.json();
        resultDiv.innerHTML = `<span style="color: red;">Error: ${
          result.message || 'An error occurred'
        }</span>`;
      }
    } catch (error) {
      resultDiv.innerHTML = `<span style="color: red;">Error submitting channel. Please try again.</span>`;
    } finally {
      submitButton.disabled = false;
      submitButton.innerText = 'Submit';
    }
  });

async function downloadCSV() {
  const button = document.getElementById('download-csv');

  button.disabled = true;
  button.style.backgroundColor = '#ccc';
  button.style.cursor = 'not-allowed';
  button.title = 'Loading, please wait...';

  try {
    const response = await fetch('https://api.communitrics.com/api/all');
    const data = await response.json();
    const channels = data.channels;

    const headers = Object.keys(channels[0]);

    const csvData = channels.map(channel => {
      return headers
        .map(key => {
          let value = channel[key];

          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }

          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'channels.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading CSV:', error);
  } finally {
    button.disabled = false;
    button.style.backgroundColor = '#e0e0e0';
    button.style.cursor = 'pointer';
    button.title = '';
  }
}

window.onload = async function () {
  getUrlParams();
  const fetchData2Promise = fetchData2();
  const fetchChannelsPromise = fetchChannels(currentPage, searchQuery);
  await Promise.all([fetchData2Promise, fetchChannelsPromise]);
};

document
  .getElementById('search-input')
  .addEventListener('input', debounce(searchChannels, 200));

function debounce(func, delay) {
  let debounceTimer;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

window.onclick = function (event) {
  const submissionModal = document.getElementById('submission-modal');
  const channelModal = document.getElementById('channel-modal');

  if (event.target == submissionModal) {
    closeSubmissionModal();
  } else if (event.target == channelModal) {
    closeModal();
  }
};
