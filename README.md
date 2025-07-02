# StockAlert - Real-Time Drug Stock Monitoring System

StockAlert is a real-time drug stock monitoring system designed to streamline communication between clinic staff, supply chain managers, and hospital administrators.

## Problem

Clinics often run out of essential drugs without warning, leading to delays in patient care, increased mortality risk, and inefficient resource allocation.

## Solution

StockAlert provides an integrated platform with the following key features:

1. **Low Stock Reporting via USSD API**
   - Clinic staff can quickly report low stock levels using a simple USSD menu (e.g., 123 456#)
   - USSD API allows for offline or low-bandwidth reporting
   - Staff can select drug name, quantity remaining, and urgency level

2. **SMS Alerts to Supply Chain Teams**
   - Automated SMS alerts to supply chain managers when a drug falls below pre-set thresholds
   - Alerts include clinic name/ID, drug name, quantity, time, and location

3. **Incentivize Reporting with Airtime API**
   - Rewards clinic staff with airtime for prompt and accurate reporting
   - Automatic rewards upon successful alert submission

4. **Visual Dashboard for Administrators**
   - Real-time visibility into current stock levels across clinics
   - Historical trends and restock frequency
   - Alert response times and staff participation metrics

## Technology Stack

- **Frontend**: Next.js with TypeScript and TailwindCSS
- **Backend**: Firebase (Authentication and Firestore database)
- **APIs**:
  - USSD API for low-tech, accessible reporting
  - SMS Gateway for sending alerts
  - Airtime API for staff rewards

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/stock-alert.git
cd stock-alert
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables by copying `.env.example` to `.env.local` and filling in your Firebase credentials:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Features and User Roles

### Hospital/Clinic Staff
- Report low stock levels via web interface or USSD
- View current inventory status
- Track history of alerts and resupply

### Suppliers
- Receive alerts for low stock items
- Manage and prioritize resupply requests
- Mark alerts as acknowledged or fulfilled

### Administrators
- Access analytics dashboard
- Monitor system performance
- Manage users and settings

## Benefits

- **Improved Patient Care**: Ensures availability of essential drugs at critical times
- **Efficient Supply Chain**: Reduces delays and overstocking with proactive restocking
- **Staff Engagement**: Motivates clinic workers through instant incentives
- **Data-Driven Decisions**: Enables administrators to optimize resource distribution

## License

This project is licensed under the MIT License - see the LICENSE file for details.
