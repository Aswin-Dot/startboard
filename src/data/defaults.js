// src/data/defaults.js
// Demo data and metric template library

export function generateDays(count = 30) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
  }
  return days;
}

function trend(start, end, count = 30, noise = 0.08) {
  return Array.from({ length: count }, (_, i) => {
    const base = start + (end - start) * (i / (count - 1));
    const jitter = base * noise * (Math.random() - 0.5) * 2;
    return parseFloat((base + jitter).toFixed(2));
  });
}

const DAYS = generateDays(30);

export const DEFAULT_PANELS = [
  {
    id: 'time-to-order',
    type: 'trend',
    title: 'Time to First Order',
    subtitle: 'North Star',
    unit: 'days',
    unitPosition: 'after',
    prefix: '',
    color: '#6c63ff',
    target: 3,
    targetLabel: 'Target',
    tooltip: 'Most important metric. Under 3 days = strong pull. Over 7 days = friction in your funnel.',
    higherIsBetter: false,
    data: DAYS.map((date, i) => ({
      date,
      value: trend(6.2, 3.8, 30, 0.06)[i],
    })),
  },
  {
    id: 'aov',
    type: 'trend',
    title: 'Average Order Value',
    subtitle: 'AOV',
    unit: '',
    unitPosition: 'after',
    prefix: '₹',
    color: '#43e97b',
    target: 500,
    targetLabel: 'Target AOV',
    tooltip: 'Rising AOV with rising orders = strong product-market fit signal.',
    higherIsBetter: true,
    data: DAYS.map((date, i) => ({
      date,
      value: trend(340, 420, 30, 0.07)[i],
    })),
  },
  {
    id: 'dau-mau',
    type: 'ratio',
    title: 'DAU / MAU',
    subtitle: 'Engagement',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#f7971e',
    target: 20,
    targetLabel: 'Healthy threshold',
    tooltip: 'Above 20% is healthy for a consumer app. WhatsApp is ~70%. Most early apps are 5–15%.',
    higherIsBetter: true,
    data: DAYS.map((date, i) => {
      const mau = Math.round(trend(400, 580, 30, 0.04)[i]);
      const ratio = trend(8, 14, 30, 0.06)[i];
      const dau = Math.round(mau * ratio / 100);
      return { date, value: parseFloat(ratio.toFixed(1)), dau, mau };
    }),
  },
  {
    id: 'repeat-order-rate',
    type: 'trend',
    title: 'Repeat Order Rate',
    subtitle: 'Loyalty',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#43e97b',
    target: 40,
    targetLabel: 'Target',
    tooltip: 'Above 30% repeat rate in first 60 days = genuine habit formation. The goal for grocery.',
    higherIsBetter: true,
    data: DAYS.map((date, i) => ({
      date,
      value: trend(18, 31, 30, 0.07)[i],
    })),
  },
  {
    id: 'cac',
    type: 'trend',
    title: 'Customer Acquisition Cost',
    subtitle: 'CAC',
    unit: '',
    unitPosition: 'after',
    prefix: '₹',
    color: '#f7971e',
    target: 200,
    targetLabel: 'Max CAC',
    tooltip: 'CAC should be less than 1/3 of LTV. Rising CAC with flat LTV = unsustainable growth.',
    higherIsBetter: false,
    data: DAYS.map((date, i) => ({
      date,
      value: trend(380, 290, 30, 0.08)[i],
    })),
  },
  {
    id: 'dropoff',
    type: 'ranked',
    title: 'Drop-off Screens',
    subtitle: 'Funnel Leaks',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#ff6584',
    tooltip: 'These are the screens killing your conversion. Fix the top 2 before building anything new.',
    higherIsBetter: false,
    items: [
      { screen: 'Checkout → Payment', value: 68 },
      { screen: 'Home → Product Detail', value: 41 },
      { screen: 'Product Detail → Add to Cart', value: 33 },
      { screen: 'Search → Results', value: 22 },
      { screen: 'Cart → Checkout', value: 18 },
      { screen: 'Signup → Home', value: 12 },
    ],
  },
];

// Library of metric templates a founder can add
export const METRIC_TEMPLATES = [
  {
    id: 'churn-rate',
    type: 'trend',
    title: 'Monthly Churn Rate',
    subtitle: 'Retention',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#ff6584',
    target: 5,
    targetLabel: 'Max acceptable',
    tooltip: 'Below 5% monthly churn is acceptable for early-stage. Below 2% = strong retention.',
    higherIsBetter: false,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(12, 7, 30, 0.1)[i] })),
  },
  {
    id: 'ltv',
    type: 'trend',
    title: 'Lifetime Value',
    subtitle: 'LTV',
    unit: '',
    unitPosition: 'after',
    prefix: '₹',
    color: '#43e97b',
    target: 1000,
    targetLabel: 'LTV target',
    tooltip: 'LTV:CAC ratio above 3:1 is the benchmark for sustainable unit economics.',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(620, 810, 30, 0.05)[i] })),
  },
  {
    id: 'refund-rate',
    type: 'trend',
    title: 'Refund Rate',
    subtitle: 'Quality Signal',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#ff6584',
    target: 3,
    targetLabel: 'Max acceptable',
    tooltip: 'Above 5% refund rate signals a product or fulfilment quality problem.',
    higherIsBetter: false,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(8, 4.2, 30, 0.12)[i] })),
  },
  {
    id: 'session-length',
    type: 'trend',
    title: 'Avg Session Length',
    subtitle: 'Engagement',
    unit: 'min',
    unitPosition: 'after',
    prefix: '',
    color: '#6c63ff',
    target: 3,
    targetLabel: 'Target',
    tooltip: 'For a grocery app, 2–5 min is the sweet spot. Under 1 min = users not finding what they want.',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(1.8, 3.2, 30, 0.1)[i] })),
  },
  {
    id: 'nps',
    type: 'trend',
    title: 'Net Promoter Score',
    subtitle: 'NPS',
    unit: '',
    unitPosition: 'after',
    prefix: '',
    color: '#43e97b',
    target: 50,
    targetLabel: 'Good NPS',
    tooltip: 'Above 50 = excellent. 30–50 = good. Below 0 = critical product issues to fix.',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: Math.round(trend(22, 48, 30, 0.08)[i]) })),
  },
  {
    id: 'orders-per-day',
    type: 'trend',
    title: 'Orders per Day',
    subtitle: 'Volume',
    unit: 'orders',
    unitPosition: 'after',
    prefix: '',
    color: '#6c63ff',
    target: 200,
    targetLabel: 'Daily target',
    tooltip: 'Daily order volume is your growth pulse. Watch week-over-week, not day-over-day.',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: Math.round(trend(45, 130, 30, 0.12)[i]) })),
  },
  {
    id: 'signup-to-order',
    type: 'trend',
    title: 'Signup → First Order',
    subtitle: 'Activation Rate',
    unit: '%',
    unitPosition: 'after',
    prefix: '',
    color: '#f7971e',
    target: 30,
    targetLabel: 'Target',
    tooltip: 'What % of signups place their first order. Below 10% = onboarding problem. Above 30% = excellent.',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(8, 18, 30, 0.09)[i] })),
  },
  {
    id: 'custom',
    type: 'trend',
    title: 'Custom Metric',
    subtitle: '',
    unit: '',
    unitPosition: 'after',
    prefix: '',
    color: '#6c63ff',
    target: null,
    targetLabel: '',
    tooltip: '',
    higherIsBetter: true,
    defaultData: () => DAYS.map((date, i) => ({ date, value: trend(10, 50, 30, 0.1)[i] })),
  },
];
