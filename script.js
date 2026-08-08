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
