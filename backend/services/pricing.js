const DAY_MS = 24 * 60 * 60 * 1000;

function computePrice(prices, start, end) {
  const ms = new Date(end) - new Date(start);
  if (ms <= 0) return { priceTotal: 0, pricingUnit: 'hourly', hours: 0 };

  const hours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.ceil(ms / DAY_MS);

  if (ms >= 30 * DAY_MS && prices.monthly) {
    const months = Math.ceil(days / 30);
    return { priceTotal: months * prices.monthly, pricingUnit: 'monthly', months };
  }
  if (ms >= DAY_MS && prices.daily) {
    return { priceTotal: days * prices.daily, pricingUnit: 'daily', days };
  }
  let priceTotal = hours * prices.hourly;
  if (prices.daily && priceTotal > prices.daily) priceTotal = prices.daily;
  return { priceTotal, pricingUnit: 'hourly', hours };
}

module.exports = { computePrice };