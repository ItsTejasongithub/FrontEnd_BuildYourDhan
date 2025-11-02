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
      console.error(`Failed to fetch ${folder}/${filename}: HTTP ${response.status}`);
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
    const response = await fetch('/data/Fixed_Deposits/fd_rates.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    const rates = { '3M': [], '1Y': [], '3Y': [] };
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 4) {
        rates['3M'].push(parseFloat(parts[1]));
        rates['1Y'].push(parseFloat(parts[2]));
        rates['3Y'].push(parseFloat(parts[3]));
      }
    }
    console.log('✅ FD Rates loaded');
    return rates;
  } catch (error) {
    console.error('Failed to load FD rates:', error);
    return { '3M': [4.5], '1Y': [6.5], '3Y': [7.5] };
  }
};