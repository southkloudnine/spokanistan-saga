// Mobile menu
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => nav.classList.toggle('open'));
}

// Use a local photo automatically if the expected image file exists.
// If it doesn't, the built-in placeholder remains visible.
document.querySelectorAll('.image-slot[data-image]').forEach((slot) => {
  const src = slot.dataset.image;
  const img = new Image();
  img.onload = () => {
    slot.style.backgroundImage = `url('${src}')`;
    const note = slot.querySelector('.image-note');
    if (note) note.remove();
  };
  img.src = src;
});

// Countdown. Change data-date on the homepage when your next ride is booked.
const countdown = document.querySelector('.countdown[data-date]');
if (countdown) {
  const target = new Date(countdown.dataset.date);
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');

  const tick = () => {
    const diff = Math.max(0, target - new Date());
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (daysEl) daysEl.textContent = String(days);
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
  };

  tick();
  setInterval(tick, 30000);
}

// Full-size photo viewer for ride-page photo evidence.
const zoomablePhotos = document.querySelectorAll('.gallery-photo[data-image], .ride-main-photo[data-image]');
if (zoomablePhotos.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'photo-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Full-size ride photo');

  const closeButton = document.createElement('button');
  closeButton.className = 'photo-lightbox-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close photo');
  closeButton.textContent = '×';

  const fullImage = document.createElement('img');
  fullImage.alt = 'Full-size ride photo';

  const hint = document.createElement('div');
  hint.className = 'photo-lightbox-hint';
  hint.textContent = 'Tap outside photo or press Esc to close';

  lightbox.append(closeButton, fullImage, hint);
  document.body.appendChild(lightbox);

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    fullImage.removeAttribute('src');
    document.body.style.overflow = '';
  };

  zoomablePhotos.forEach((photo) => {
    photo.setAttribute('tabindex', '0');
    photo.setAttribute('role', 'button');
    photo.setAttribute('aria-label', 'Open full-size photo');

    const openPhoto = () => {
      fullImage.src = photo.dataset.image;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    photo.addEventListener('click', openPhoto);
    photo.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPhoto();
      }
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });
}
