const IST_OFFSET_MINUTES = 5 * 60 + 30; 

function istClockToUtc(istMidnightUtc, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(istMidnightUtc.getTime() + (h * 60 + m) * 60 * 1000);
}

function istDayOfWeek(instantUtc) {
  const shifted = new Date(instantUtc.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.getUTCDay();
}

function startOfIstDay(instantUtc) {
  const shifted = new Date(instantUtc.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
}

module.exports = { istClockToUtc, istDayOfWeek, startOfIstDay };