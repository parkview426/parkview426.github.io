const availabilityRanges = [
  { start: '2026-07-01', end: '2026-07-07', rate: 120 },
  { start: '2026-07-10', end: '2026-07-20', rate: 140 },
  { start: '2026-08-01', end: '2026-08-15', rate: 160 },
  { start: '2026-09-01', end: '2026-09-30', rate: 110 }
];

const dateOptions = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };
const calendarMonths = document.getElementById('calendar-months');
const summaryPanel = document.getElementById('booking-summary');
const summaryDates = document.getElementById('summary-dates');
const summaryNights = document.getElementById('summary-nights');
const summaryRate = document.getElementById('summary-rate');
const summaryTotal = document.getElementById('summary-total');
const summaryMessage = document.getElementById('summary-message');
const bookNowLink = document.getElementById('book-now-btn');
const clearButton = document.getElementById('clear-selection');

let selectedStart = null;
let selectedEnd = null;
let activeRate = null;

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString('en-GB', dateOptions);
}

function formatRate(rate) {
  return `£${rate.toFixed(0)} per night`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function isDateAvailable(dateKey) {
  return availabilityRanges.some(range => dateKey >= range.start && dateKey <= range.end);
}

function getRangeForDate(dateKey) {
  return availabilityRanges.find(range => dateKey >= range.start && dateKey <= range.end);
}

function getSelectionRange() {
  if (!selectedStart || !selectedEnd) return [];
  const start = parseDate(selectedStart);
  const end = parseDate(selectedEnd);
  const days = [];
  let current = new Date(start);
  while (current <= end) {
    days.push(getDateKey(current));
    current = addDays(current, 1);
  }
  return days;
}

function isRangeAvailable(startKey, endKey) {
  const start = parseDate(startKey);
  const end = parseDate(endKey);
  if (end <= start) return false;
  let current = new Date(start);
  const range = getRangeForDate(startKey);
  if (!range) return false;
  while (current < end) {
    const key = getDateKey(current);
    if (!isDateAvailable(key)) return false;
    if (!getRangeForDate(key) || getRangeForDate(key).rate !== range.rate) return false;
    current = addDays(current, 1);
  }
  activeRate = range.rate;
  return true;
}

function getNights(startKey, endKey) {
  const start = parseDate(startKey);
  const end = parseDate(endKey);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function onDateClick(dateKey) {
  if (!selectedStart || (selectedStart && selectedEnd)) {
    selectedStart = dateKey;
    selectedEnd = null;
    activeRate = getRangeForDate(dateKey)?.rate || null;
  } else {
    if (dateKey < selectedStart) {
      selectedStart = dateKey;
      selectedEnd = null;
      activeRate = getRangeForDate(dateKey)?.rate || null;
    } else {
      if (isRangeAvailable(selectedStart, dateKey)) {
        selectedEnd = dateKey;
      } else {
        summaryMessage.textContent = 'Please select a continuous available stay within the same rate period.';
        summaryPanel.classList.remove('visible');
        renderCalendars();
        return;
      }
    }
  }
  summaryMessage.textContent = '';
  renderCalendars();
  updateSummary();
}

function renderCalendars() {
  calendarMonths.innerHTML = '';
  const today = new Date();
  for (let i = 0; i < 3; i += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    calendarMonths.appendChild(createMonthGrid(date));
  }
}

function createMonthGrid(date) {
  const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = monthStart.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const monthEl = document.createElement('section');
  monthEl.className = 'calendar-month';
  const title = document.createElement('h3');
  title.textContent = monthName;
  monthEl.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  for (let empty = 0; empty < startDay; empty += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObject = new Date(date.getFullYear(), date.getMonth(), day);
    const dateKey = getDateKey(dateObject);
    const weekday = dateObject.toLocaleDateString('en-GB', { weekday: 'short' });
    const cell = document.createElement('button');
    cell.className = 'calendar-cell';
    cell.type = 'button';
    cell.innerHTML = `
      <span class="calendar-day-name">${weekday}</span>
      <span class="calendar-day-number">${day}</span>
    `;

    if (isDateAvailable(dateKey)) {
      cell.classList.add('available');
      cell.addEventListener('click', () => onDateClick(dateKey));
    } else {
      cell.classList.add('unavailable');
      cell.disabled = true;
    }

    if (selectedStart === dateKey) {
      cell.classList.add('selected-start');
    }

    if (selectedEnd === dateKey) {
      cell.classList.add('selected-end');
    }

    const rangeDays = getSelectionRange();
    if (rangeDays.includes(dateKey) && selectedStart && selectedEnd) {
      cell.classList.add('selected-range');
    }

    grid.appendChild(cell);
  }

  monthEl.appendChild(grid);
  return monthEl;
}

function updateSummary() {
  if (!selectedStart) {
    summaryPanel.classList.remove('visible');
    return;
  }

  summaryPanel.classList.add('visible');
  if (!selectedEnd) {
    summaryDates.textContent = `Arrival: ${formatDate(selectedStart)} — select your departure date.`;
    summaryNights.textContent = '';
    summaryRate.textContent = activeRate ? formatRate(activeRate) : 'Rate not available yet';
    summaryTotal.textContent = '';
    bookNowLink.classList.add('disabled');
    summaryMessage.textContent = 'Choose a second available date to see the total price and book.';
    clearButton.classList.remove('hidden');
    return;
  }

  const nights = getNights(selectedStart, selectedEnd);
  const totalPrice = nights * activeRate;
  summaryDates.textContent = `${formatDate(selectedStart)} to ${formatDate(selectedEnd)}`;
  summaryNights.textContent = `${nights} night${nights !== 1 ? 's' : ''}`;
  summaryRate.textContent = formatRate(activeRate);
  summaryTotal.textContent = `Total: £${totalPrice}`;
  summaryMessage.textContent = '';
  bookNowLink.classList.remove('disabled');
  const mailSubject = encodeURIComponent(`Booking request from ${formatDate(selectedStart)} to ${formatDate(selectedEnd)}`);
  const mailBody = encodeURIComponent(`Hello,\n\nI would like to book from ${formatDate(selectedStart)} to ${formatDate(selectedEnd)} (${nights} nights) at £${totalPrice}.\n\nThank you.`);
  bookNowLink.href = `mailto:parkviewhru426@gmail.com?subject=${mailSubject}&body=${mailBody}`;
  clearButton.classList.remove('hidden');
}

clearButton.addEventListener('click', () => {
  selectedStart = null;
  selectedEnd = null;
  activeRate = null;
  summaryMessage.textContent = '';
  summaryDates.textContent = 'Select an arrival date to begin.';
  summaryNights.textContent = '';
  summaryRate.textContent = '';
  summaryTotal.textContent = '';
  bookNowLink.classList.add('disabled');
  summaryPanel.classList.remove('visible');
  clearButton.classList.add('hidden');
  renderCalendars();
});

renderCalendars();
updateSummary();
