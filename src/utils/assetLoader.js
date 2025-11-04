// assetLoader.js - Handles all CSV loading and asset timeline logic

export const loadAssetTimeline = async () => {
  try {
    const response = await fetch('/data/Asset_Timeline.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    const timeline = {};
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 5) {
        const [category, asset, firstYear, lastYear, totalRecords] = parts;
        if (!timeline[category]) timeline[category] = {};
        timeline[category][asset] = {
          firstYear: parseInt(firstYear),
          lastYear: parseInt(lastYear),
          totalRecords: parseInt(totalRecords)
        };
      }
    }
    console.log('✅ Asset Timeline loaded:', Object.keys(timeline));
    return timeline;
  } catch (error) {
    console.error('Failed to load Asset Timeline:', error);
    return {};
  }
};

export const loadCSVData = async (filename, folder) => {
  try {
    const response = await fetch(`/data/${folder}/${filename}`);
    if (!response.ok) {
      console.error(`❌ Failed to fetch ${folder}/${filename}: HTTP ${response.status}`);
      console.error(`   Check if file exists in public/data/${folder}/${filename}`);
      return null;
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 4) {
      console.error(`${filename}: Not enough data lines`);
      return null;
    }
    
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIndex = 0;
    const closeIndex = header.findIndex(h => 
      h.includes('close') || h.includes('price') || h.includes('nav')
    );
    
    if (closeIndex === -1) {
      console.error(`${filename}: Missing close/price column`);
      return null;
    }
    
    const yearlyData = {};
    let validRows = 0;
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length <= Math.max(dateIndex, closeIndex)) continue;
      
      const dateStr = parts[dateIndex];
      const closeStr = parts[closeIndex];
      
      if (!dateStr || !closeStr) continue;
      
      try {
        const dateObj = new Date(dateStr);
        const year = dateObj.getFullYear();
        const price = parseFloat(closeStr);
        
        if (!isNaN(year) && !isNaN(price) && price > 0 && year >= 1990 && year <= 2030) {
          if (!yearlyData[year]) yearlyData[year] = [];
          yearlyData[year].push(price);
          validRows++;
        }
      } catch (e) {
        // Skip invalid rows
      }
    }
    
    if (validRows === 0) {
      console.error(`${filename}: No valid data rows`);
      return null;
    }
    
    const prices = [];
    const sortedYears = Object.keys(yearlyData).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedYears.forEach(year => {
      const avgPrice = yearlyData[year].reduce((a, b) => a + b, 0) / yearlyData[year].length;
      prices[parseInt(year)] = Math.round(avgPrice * 100) / 100;
    });
    
    console.log(`✅ ${filename}: ${sortedYears.length} years, ${validRows} rows`);
    return { 
      prices, 
      startYear: parseInt(sortedYears[0]), 
      endYear: parseInt(sortedYears[sortedYears.length - 1]) 
    };
    
  } catch (error) {
    console.error(`Failed to load ${folder}/${filename}:`, error.message);
    return null;
  }
};

export const filterAssetsByTimeline = (assets, category, gameStartYear, timeline, yearsNeeded = 20) => {
  if (!timeline[category]) {
    console.warn(`Category ${category} not found in timeline`);
    return [];
  }
  
  return assets.filter(asset => {
    const assetInfo = timeline[category][asset.id];
    if (!assetInfo) {
      console.warn(`Asset ${asset.id} not in timeline for ${category}`);
      return false;
    }
    const available = assetInfo.firstYear <= gameStartYear && 
                     assetInfo.lastYear >= gameStartYear + yearsNeeded;
    if (!available) {
      console.log(`⏭️ Skipping ${asset.id}: needs ${gameStartYear}-${gameStartYear + yearsNeeded}, has ${assetInfo.firstYear}-${assetInfo.lastYear}`);
    }
    return available;
  });
};

export const loadAssetData = async (assets, folderName) => {
  const loaded = [];
  for (const asset of assets) {
    const data = await loadCSVData(asset.csvFile, folderName);
    if (data) {
      loaded.push({
        ...asset,
        prices: data.prices,
        startYear: data.startYear,
        endYear: data.endYear
      });
    }
  }
  return loaded;
};

export const loadFDRates = async () => {
  try {
    const response = await fetch('/data/Fd_Rate/fd_rates.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());

    // Parse FD rates by year (1990-2025)
    // CSV format: Date Range, 1Y, 2Y, 3Y, 5Y
    const ratesByYear = {};

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('YEAR')) continue;

      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 5) continue;

      const dateRange = parts[0];
      const rate1Y = parseFloat(parts[1]);
      const rate2Y = parseFloat(parts[2]);
      const rate3Y = parseFloat(parts[3]);
      const rate5Y = parseFloat(parts[4]);

      if (!dateRange || isNaN(rate1Y)) continue;

      // Extract start year from date range (e.g., "01-04-1991 to 30-09-1991" -> 1991)
      const yearMatch = dateRange.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1990 && year <= 2025) {
          ratesByYear[year] = {
            '1Y': rate1Y,
            '2Y': rate2Y,
            '3Y': rate3Y,
            '5Y': rate5Y
          };
        }
      }
    }

    // Create arrays for years 1990-2025
    const rates = { '1Y': [], '2Y': [], '3Y': [], '5Y': [] };
    let lastKnownRates = { '1Y': 8.0, '2Y': 9.0, '3Y': 10.0, '5Y': 11.0 };

    for (let year = 1990; year <= 2025; year++) {
      if (ratesByYear[year]) {
        rates['1Y'][year] = ratesByYear[year]['1Y'];
        rates['2Y'][year] = ratesByYear[year]['2Y'];
        rates['3Y'][year] = ratesByYear[year]['3Y'];
        rates['5Y'][year] = ratesByYear[year]['5Y'];
        lastKnownRates = ratesByYear[year];
      } else {
        // Use last known rates for missing years
        rates['1Y'][year] = lastKnownRates['1Y'];
        rates['2Y'][year] = lastKnownRates['2Y'];
        rates['3Y'][year] = lastKnownRates['3Y'];
        rates['5Y'][year] = lastKnownRates['5Y'];
      }
    }

    console.log('✅ FD Rates loaded (1990-2025)');
    return rates;
  } catch (error) {
    console.error('Failed to load FD rates:', error);
    // Fallback rates for years 1990-2025
    const fallback = { '1Y': [], '2Y': [], '3Y': [], '5Y': [] };
    for (let year = 1990; year <= 2025; year++) {
      fallback['1Y'][year] = 6.5;
      fallback['2Y'][year] = 7.0;
      fallback['3Y'][year] = 7.5;
      fallback['5Y'][year] = 8.0;
    }
    return fallback;
  }
};

/**
 * Validates that all required asset files exist
 * Call this during app initialization to catch file naming issues early
 */
export const validateAssetFiles = async (assetDefinitions) => {
  console.log('🔍 Validating asset files...');
  const missingFiles = [];

  for (const asset of assetDefinitions) {
    const url = `/data/${asset.category}/${asset.csvFile}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        missingFiles.push({
          id: asset.id,
          file: asset.csvFile,
          category: asset.category,
          expectedPath: url
        });
      }
    } catch (error) {
      missingFiles.push({
        id: asset.id,
        file: asset.csvFile,
        category: asset.category,
        expectedPath: url,
        error: error.message
      });
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ Missing or inaccessible asset files:');
    missingFiles.forEach(({ id, expectedPath }) => {
      console.error(`   - ${id}: ${expectedPath}`);
    });
    console.error(`\n⚠️  Total missing files: ${missingFiles.length}`);
    console.error('   Please regenerate data using DataCollector.py');
    return { valid: false, missingFiles };
  }

  console.log('✅ All asset files validated successfully');
  return { valid: true, missingFiles: [] };
};