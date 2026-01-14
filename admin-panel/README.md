# Trendyol Analytics Dashboard - Admin Panel

React-based admin panel for Trendyol product analytics and reporting.

## Features

- **📁 Category Management**: Browse main categories and subcategories
- **📈 Report Generation**: Create reports from selected categories with progress tracking
- **📊 Report Dashboard**: Comprehensive analytics with 15 tabs in 4 groups
- **💰 Price Analysis**: Multi-range price distribution and trends
- **⭐ Rating & Quality**: Review scores and quality metrics
- **🏪 Merchant Analysis**: Seller statistics and market insights
- **📣 Social Proof**: Views, orders, and engagement metrics

## Tech Stack

- **React 19.2.0** - UI library
- **Vite 7.2.2** - Build tool and dev server
- **React Router 7.9.5** - Client-side routing
- **Recharts 3.4.1** - Data visualization
- **Tailwind CSS 4.1.17** - Utility-first styling

## Project Structure

```
admin-panel/
├── src/
│   ├── components/
│   │   ├── CategoryManagement.jsx    # Browse categories
│   │   ├── ReportGeneration.jsx      # Create reports
│   │   ├── ReportList.jsx            # List all reports
│   │   └── ReportDashboard.jsx       # Analytics dashboard
│   ├── config/
│   │   └── api.js                    # API configuration & utilities
│   ├── constants/
│   │   ├── tabGroups.js              # Dashboard tab configuration
│   │   └── categories.js             # Category icons & colors
│   ├── App.jsx                       # Main routing component
│   ├── main.jsx                      # Entry point
│   └── index.css                     # Global Tailwind styles
├── public/
├── index.html
├── package.json
├── vite.config.js
└── .env                              # Environment variables
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on port 8001

### Installation

```bash
npm install
```

### Environment Setup

Create `.env` file:

```env
VITE_API_URL=http://127.0.0.1:8001
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

### Lint

```bash
npm run lint
```

## API Integration

The admin panel communicates with FastAPI backend on port 8001.

**Key Endpoints:**
- `GET /categories/main` - Fetch main categories
- `POST /api/reports/create` - Create new report
- `GET /api/reports/{id}/dashboard-data` - Dashboard KPIs & charts
- `GET /api/reports/{id}/reviews-summary` - Review analysis
- `GET /api/reports/{id}/social-proof` - Social metrics

**Timeout Configuration:**
- Standard requests: 30 seconds
- Dashboard initial load: 3 minutes
- Enrichment data: 2 minutes

See `src/config/api.js` for full configuration.

## Features Detail

### Category Management

Browse Trendyol's category hierarchy:
- Main categories with icons and colors
- Subcategory exploration
- Direct links to Trendyol website

### Report Generation

Create comprehensive product reports:
- Select category
- Background scraping with progress tracking
- Exponential backoff polling (75% request reduction)
- Custom report naming

### Report Dashboard

15-tab analytics dashboard:

**📊 Overview Group:**
- General Overview
- Price Analysis
- Rating & Quality

**🏪 Market Group:**
- Merchant Analysis
- Barcode/Origin
- Country of Origin

**👥 Engagement Group:**
- Reviews Analysis
- Social Proof Metrics

**🔬 Advanced Group:**
- Advanced Analytics

## Performance Optimizations

- ✅ **65% bundle size reduction** (500KB → 175KB) via lazy loading
- ✅ **75% fewer API requests** via exponential backoff
- ✅ **Memory leak prevention** via proper cleanup
- ✅ **Race condition prevention** via request deduplication
- ✅ **Timeout protection** on all API calls

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

This is a private analytics tool for Trendyol product research.

## License

Proprietary - Internal Use Only
