# Build Your Dhan - Asset Data Package

Generated: 2025-11-01 16:22:20

## 📊 Data Summary

- **Total Categories**: 8
- **Total Assets**: 123
- **Successfully Downloaded**: 120
- **Success Rate**: 97.6%

## 📁 Directory Structure

```
data/
├── Indian_Stocks/
│   └── (CSV files for each asset)
├── Index_Funds/
│   └── (CSV files for each asset)
├── Mutual_Funds/
│   └── (CSV files for each asset)
├── Commodities/
│   └── (CSV files for each asset)
├── Crypto_Assets/
│   └── (CSV files for each asset)
├── REIT/
│   └── (CSV files for each asset)
├── Gold_Investments/
│   └── (CSV files for each asset)
├── Forex/
│   └── (CSV files for each asset)
├── Asset_Timeline.csv
└── README.md
```

## 📋 Category Details

### Indian_Stocks
- Assets: 95
- Downloaded: 92
- Success Rate: 96.8%

### Index_Funds
- Assets: 5
- Downloaded: 5
- Success Rate: 100.0%

### Mutual_Funds
- Assets: 7
- Downloaded: 7
- Success Rate: 100.0%

### Commodities
- Assets: 8
- Downloaded: 8
- Success Rate: 100.0%

### Crypto_Assets
- Assets: 2
- Downloaded: 2
- Success Rate: 100.0%

### REIT
- Assets: 2
- Downloaded: 2
- Success Rate: 100.0%

### Gold_Investments
- Assets: 1
- Downloaded: 1
- Success Rate: 100.0%

### Forex
- Assets: 3
- Downloaded: 3
- Success Rate: 100.0%

## 🎮 Usage in Game

These CSV files are loaded by the game at runtime:

```javascript
// Load asset data
const response = await fetch('/data/Indian_Stocks/TCS.csv');
const text = await response.text();
// Parse CSV and use in game
```

## 📝 CSV Format

All CSV files have the following columns:
- Date: Trading date (YYYY-MM-DD)
- Open: Opening price
- High: Highest price
- Low: Lowest price
- Close: Closing price
- Volume: Trading volume

## 🔄 Updating Data

Run the data collector script again to update:
```bash
python Complete_Asset_Data_Collector.py
```
