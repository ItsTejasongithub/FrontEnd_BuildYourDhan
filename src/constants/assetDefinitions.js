// assetDefinitions.js - All asset definitions with proper category mapping

export const INDIAN_STOCKS = [
  // Existing stocks - VERIFIED ✓
  { id: 'TATAMOTORS', name: 'Tata Motors', csvFile: 'TATAMOTORS.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'INFY', name: 'Infosys', csvFile: 'INFY.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'WIPRO', name: 'Wipro', csvFile: 'WIPRO.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'HDFCBANK', name: 'HDFC Bank', csvFile: 'HDFCBANK.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'SBIN', name: 'State Bank of India', csvFile: 'SBIN.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'RELIANCE', name: 'Reliance Industries', csvFile: 'RELIANCE.csv', sector: 'Energy', category: 'Indian_Stocks' },
  { id: 'ONGC', name: 'ONGC', csvFile: 'ONGC.csv', sector: 'Energy', category: 'Indian_Stocks' },
  { id: 'TCS', name: 'Tata Consultancy Services', csvFile: 'TCS.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'ICICIBANK', name: 'ICICI Bank', csvFile: 'ICICIBANK.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'BAJFINANCE', name: 'Bajaj Finance', csvFile: 'BAJFINANCE.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'MARUTI', name: 'Maruti Suzuki', csvFile: 'MARUTI.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'AXISBANK', name: 'Axis Bank', csvFile: 'AXISBANK.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'KOTAKBANK', name: 'Kotak Mahindra Bank', csvFile: 'KOTAKBANK.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'HINDUNILVR', name: 'Hindustan Unilever', csvFile: 'HINDUNILVR.csv', sector: 'FMCG', category: 'Indian_Stocks' },
  { id: 'ITC', name: 'ITC Limited', csvFile: 'ITC.csv', sector: 'FMCG', category: 'Indian_Stocks' },
  { id: 'BHARTIARTL', name: 'Bharti Airtel', csvFile: 'BHARTIARTL.csv', sector: 'Telecom', category: 'Indian_Stocks' },
  { id: 'TITAN', name: 'Titan Company', csvFile: 'TITAN.csv', sector: 'Consumer', category: 'Indian_Stocks' },
  { id: 'ASIANPAINT', name: 'Asian Paints', csvFile: 'ASIANPAINT.csv', sector: 'Consumer', category: 'Indian_Stocks' },
  { id: 'LT', name: 'Larsen & Toubro', csvFile: 'LT.csv', sector: 'Infrastructure', category: 'Indian_Stocks' },
  { id: 'SUNPHARMA', name: 'Sun Pharma', csvFile: 'SUNPHARMA.csv', sector: 'Pharma', category: 'Indian_Stocks' },
  
  // Additional stocks - CORRECTED ✓
  { id: 'M&M', name: 'Mahindra & Mahindra', csvFile: 'M&M.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'TATACONSUM', name: 'Tata Consumer Products', csvFile: 'TATACONSUM.csv', sector: 'FMCG', category: 'Indian_Stocks' },
  { id: 'TATASTEEL', name: 'Tata Steel', csvFile: 'TATASTEEL.csv', sector: 'Metals', category: 'Indian_Stocks' },
  { id: 'HINDALCO', name: 'Hindalco Industries', csvFile: 'HINDALCO.csv', sector: 'Metals', category: 'Indian_Stocks' },
  { id: 'GAIL', name: 'GAIL India', csvFile: 'GAIL.csv', sector: 'Energy', category: 'Indian_Stocks' },
  { id: 'HCLTECH', name: 'HCL Technologies', csvFile: 'HCLTECH.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'INDUSINDBK', name: 'IndusInd Bank', csvFile: 'INDUSINDBK.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'BAJAJFINSV', name: 'Bajaj Finserv', csvFile: 'BAJAJFINSV.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'SHRIRAMFIN', name: 'Shriram Finance', csvFile: 'SHRIRAMFIN.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'BAJAJ-AUTO', name: 'Bajaj Auto', csvFile: 'BAJAJ-AUTO.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'HEROMOTOCO', name: 'Hero MotoCorp', csvFile: 'HEROMOTOCO.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'NESTLEIND', name: 'Nestle India', csvFile: 'NESTLEIND.csv', sector: 'FMCG', category: 'Indian_Stocks' },
  { id: 'APOLLOHOSP', name: 'Apollo Hospitals', csvFile: 'APOLLOHOSP.csv', sector: 'Healthcare', category: 'Indian_Stocks' },
  { id: 'ULTRACEMCO', name: 'UltraTech Cement', csvFile: 'ULTRACEMCO.csv', sector: 'Cement', category: 'Indian_Stocks' },
  { id: 'GRASIM', name: 'Grasim Industries', csvFile: 'GRASIM.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'ADANIENT', name: 'Adani Enterprises', csvFile: 'ADANIENT.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'BEL', name: 'Bharat Electronics', csvFile: 'BEL.csv', sector: 'Defense', category: 'Indian_Stocks' },
  { id: 'TRENT', name: 'Trent Limited', csvFile: 'TRENT.csv', sector: 'Retail', category: 'Indian_Stocks' },
  
  // CRITICAL FIXES - These have different keys in Python
  { id: 'Weizmann', name: 'Weizmann', csvFile: 'Weizmann.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'Indo National', name: 'Indo National', csvFile: 'Indo National.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'HFCL', name: 'HFCL Limited', csvFile: 'HFCL.csv', sector: 'Telecom', category: 'Indian_Stocks' },
  { id: 'Zee Entertainment', name: 'Zee Entertainment', csvFile: 'Zee Entertainment.csv', sector: 'Media', category: 'Indian_Stocks' },
  { id: 'Ashok Leyland', name: 'Ashok Leyland', csvFile: 'Ashok Leyland.csv', sector: 'Auto', category: 'Indian_Stocks' },
  { id: 'ITI Limited', name: 'ITI Limited', csvFile: 'ITI Limited.csv', sector: 'Telecom', category: 'Indian_Stocks' },
  { id: 'CESC Limited', name: 'CESC Limited', csvFile: 'CESC Limited.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'Trident', name: 'Trident', csvFile: 'Trident.csv', sector: 'Textiles', category: 'Indian_Stocks' },
  { id: 'JSWSTEEL', name: 'JSW Steel', csvFile: 'JSWSTEEL.csv', sector: 'Metals', category: 'Indian_Stocks' },
  { id: 'Subex', name: 'Subex', csvFile: 'Subex.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'Jindal Stainless', name: 'Jindal Stainless', csvFile: 'Jindal Stainless.csv', sector: 'Metals', category: 'Indian_Stocks' },
  { id: 'UCO Bank', name: 'UCO Bank', csvFile: 'UCO Bank.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'NTPC', name: 'NTPC Limited', csvFile: 'NTPC.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'Indiabulls Real Estate', name: 'Indiabulls Real Estate', csvFile: 'Indiabulls Real Estate.csv', sector: 'Real Estate', category: 'Indian_Stocks' },
  { id: 'Suzlon Energy', name: 'Suzlon Energy', csvFile: 'Suzlon Energy.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'JP Power Ventures', name: 'JP Power Ventures', csvFile: 'JP Power Ventures.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'Yes Bank', name: 'Yes Bank', csvFile: 'Yes Bank.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'Saksoft', name: 'Saksoft', csvFile: 'Saksoft.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'TECHM', name: 'Tech Mahindra', csvFile: 'TECHM.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'GVK Power & Infra', name: 'GVK Power & Infra', csvFile: 'GVK Power & Infra.csv', sector: 'Infrastructure', category: 'Indian_Stocks' },
  { id: 'Vakrangee', name: 'Vakrangee', csvFile: 'Vakrangee.csv', sector: 'Technology', category: 'Indian_Stocks' },
  { id: 'POWERGRID', name: 'Power Grid Corporation', csvFile: 'POWERGRID.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'ADANIPORTS', name: 'Adani Ports', csvFile: 'ADANIPORTS.csv', sector: 'Infrastructure', category: 'Indian_Stocks' },
  { id: 'Vodafone Idea', name: 'Vodafone Idea', csvFile: 'Vodafone Idea.csv', sector: 'Telecom', category: 'Indian_Stocks' },
  { id: 'Websol Energy Systems', name: 'Websol Energy Systems', csvFile: 'Websol Energy Systems.csv', sector: 'Energy', category: 'Indian_Stocks' },
  { id: 'Dish TV India', name: 'Dish TV India', csvFile: 'Dish TV India.csv', sector: 'Media', category: 'Indian_Stocks' },
  { id: 'Reliance Power', name: 'Reliance Power', csvFile: 'Reliance Power.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'IRB Infrastructure', name: 'IRB Infrastructure', csvFile: 'IRB Infrastructure.csv', sector: 'Infrastructure', category: 'Indian_Stocks' },
  { id: 'RattanIndia Power', name: 'RattanIndia Power', csvFile: 'RattanIndia Power.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'Adani Power', name: 'Adani Power', csvFile: 'Adani Power.csv', sector: 'Power', category: 'Indian_Stocks' },
  { id: 'Hindustan Copper', name: 'Hindustan Copper', csvFile: 'Hindustan Copper.csv', sector: 'Metals', category: 'Indian_Stocks' },
  { id: 'Manappuram Finance', name: 'Manappuram Finance', csvFile: 'Manappuram Finance.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'RattanIndia Enterprises', name: 'RattanIndia Enterprises', csvFile: 'RattanIndia Enterprises.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'Spacenet Enterprises', name: 'Spacenet Enterprises', csvFile: 'Spacenet Enterprises.csv', sector: 'Technology', category: 'Indian_Stocks' },
  { id: 'INDIGO', name: 'InterGlobe Aviation (IndiGo)', csvFile: 'INDIGO.csv', sector: 'Aviation', category: 'Indian_Stocks' },
  { id: 'Brightcom Group', name: 'Brightcom Group', csvFile: 'Brightcom Group.csv', sector: 'Technology', category: 'Indian_Stocks' },
  { id: 'Quick Heal Technologies', name: 'Quick Heal Technologies', csvFile: 'Quick Heal Technologies.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'PNB Housing Finance', name: 'PNB Housing Finance', csvFile: 'PNB Housing Finance.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'SBILIFE', name: 'SBI Life Insurance', csvFile: 'SBILIFE.csv', sector: 'Insurance', category: 'Indian_Stocks' },
  { id: 'Sanginita Chemicals', name: 'Sanginita Chemicals', csvFile: 'Sanginita Chemicals.csv', sector: 'Chemicals', category: 'Indian_Stocks' },
  { id: 'Vertoz', name: 'Vertoz', csvFile: 'Vertoz.csv', sector: 'Technology', category: 'Indian_Stocks' },
  { id: '5Paisa Capital', name: '5Paisa Capital', csvFile: '5Paisa Capital.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'NACL Industries', name: 'NACL Industries', csvFile: 'NACL Industries.csv', sector: 'Chemicals', category: 'Indian_Stocks' },
  { id: 'Indostar Capital Finance', name: 'Indostar Capital Finance', csvFile: 'Indostar Capital Finance.csv', sector: 'Finance', category: 'Indian_Stocks' },
  { id: 'Vinny Overseas', name: 'Vinny Overseas', csvFile: 'Vinny Overseas.csv', sector: 'Diversified', category: 'Indian_Stocks' },
  { id: 'Ujjivan Small Finance Bank', name: 'Ujjivan Small Finance Bank', csvFile: 'Ujjivan Small Finance Bank.csv', sector: 'Banking', category: 'Indian_Stocks' },
  { id: 'Ksolves India', name: 'Ksolves India', csvFile: 'Ksolves India.csv', sector: 'IT', category: 'Indian_Stocks' },
  { id: 'MTAR Technologies', name: 'MTAR Technologies', csvFile: 'MTAR Technologies.csv', sector: 'Engineering', category: 'Indian_Stocks' },
  { id: 'One97 Communications (Paytm)', name: 'One97 Communications (Paytm)', csvFile: 'One97 Communications (Paytm).csv', sector: 'Fintech', category: 'Indian_Stocks' },
  { id: 'Easy Trip Planners', name: 'Easy Trip Planners', csvFile: 'Easy Trip Planners.csv', sector: 'Travel', category: 'Indian_Stocks' },
  { id: 'Railtel Corporation', name: 'Railtel Corporation', csvFile: 'Railtel Corporation.csv', sector: 'Telecom', category: 'Indian_Stocks' },
  { id: 'Honasa Consumer', name: 'Honasa Consumer', csvFile: 'Honasa Consumer.csv', sector: 'Consumer', category: 'Indian_Stocks' },
  { id: 'Hindustan Construction', name: 'Hindustan Construction', csvFile: 'Hindustan Construction.csv', sector: 'Infrastructure', category: 'Indian_Stocks' },
];

export const INDEX_FUNDS = [
  { id: 'NIFTYBEES', name: 'Nifty BeES', csvFile: 'NIFTYBEES.csv', category: 'Index_Funds' },
  { id: 'UTINIFTETF', name: 'UTI Nifty ETF', csvFile: 'UTINIFTETF.csv', category: 'Index_Funds' },
  { id: 'HDFCNIFETF', name: 'HDFC Nifty ETF', csvFile: 'HDFCNIFETF.csv', category: 'Index_Funds' },
  { id: 'SETFNIF50', name: 'SETF Nifty 50', csvFile: 'SETFNIF50.csv', category: 'Index_Funds' },
  { id: 'ICICIB22', name: 'ICICI Nifty Bank', csvFile: 'ICICIB22.csv', category: 'Index_Funds' },
];

export const MUTUAL_FUNDS = [
  { id: 'SBI_Bluechip', name: 'SBI Bluechip Fund', csvFile: 'SBI_Bluechip.csv', category: 'Mutual_Funds' },
  { id: 'ICICI_Bluechip', name: 'ICICI Bluechip Fund', csvFile: 'ICICI_Bluechip.csv', category: 'Mutual_Funds' },
  { id: 'Nippon_SmallCap', name: 'Nippon SmallCap Fund', csvFile: 'Nippon_SmallCap.csv', category: 'Mutual_Funds' },
  { id: 'Axis_Midcap', name: 'Axis Midcap Fund', csvFile: 'Axis_Midcap.csv', category: 'Mutual_Funds' },
  { id: 'Kotak_Emerging', name: 'Kotak Emerging Equity', csvFile: 'Kotak_Emerging.csv', category: 'Mutual_Funds' },
  { id: 'PGIM_Midcap', name: 'PGIM Midcap Fund', csvFile: 'PGIM_Midcap.csv', category: 'Mutual_Funds' },
  { id: 'HDFC_SmallCap', name: 'HDFC SmallCap Fund', csvFile: 'HDFC_SmallCap.csv', category: 'Mutual_Funds' },
];

export const COMMODITIES = [
  { id: 'SILVER', name: 'Silver', csvFile: 'SILVER.csv', category: 'Commodities' },
  { id: 'CRUDEOIL_WTI', name: 'Crude Oil WTI', csvFile: 'CRUDEOIL_WTI.csv', category: 'Commodities' },
  { id: 'COPPER', name: 'Copper', csvFile: 'COPPER.csv', category: 'Commodities' },
  { id: 'NATURALGAS', name: 'Natural Gas', csvFile: 'NATURALGAS.csv', category: 'Commodities' },
  { id: 'WHEAT', name: 'Wheat', csvFile: 'WHEAT.csv', category: 'Commodities' },
  { id: 'COTTON', name: 'Cotton', csvFile: 'COTTON.csv', category: 'Commodities' },
  { id: 'BRENT', name: 'Brent Crude', csvFile: 'BRENT.csv', category: 'Commodities' },
  { id: 'ALUMINIUM', name: 'Aluminium', csvFile: 'ALUMINIUM.csv', category: 'Commodities' },
];

export const CRYPTO_ASSETS = [
  { id: 'BTC', name: 'Bitcoin', csvFile: 'BTC.csv', category: 'Crypto_Assets' },
  { id: 'ETH', name: 'Ethereum', csvFile: 'ETH.csv', category: 'Crypto_Assets' },
];

export const REIT_ASSETS = [
  { id: 'EMBASSY', name: 'Embassy REIT', csvFile: 'EMBASSY.csv', category: 'REIT' },
  { id: 'MINDSPACE', name: 'Mindspace REIT', csvFile: 'MINDSPACE.csv', category: 'REIT' },
];

export const GOLD_ASSETS = [
  { id: 'Physical_Gold', name: 'Physical Gold', csvFile: 'Physical_Gold.csv', category: 'Gold_Investments' },
  { id: 'Digital_Gold', name: 'Digital Gold', csvFile: 'Digital_Gold.csv', category: 'Gold_Investments' },
];

export const FOREX_ASSETS = [
  { id: 'USDINR', name: 'USD/INR', csvFile: 'USDINR.csv', category: 'Forex' },
  { id: 'EURINR', name: 'EUR/INR', csvFile: 'EURINR.csv', category: 'Forex' },
  { id: 'GBPINR', name: 'GBP/INR', csvFile: 'GBPINR.csv', category: 'Forex' },
];

export const CATEGORY_DISPLAY_NAMES = {
  'Indian_Stocks': 'Stocks',
  'Index_Funds': 'Index Funds',
  'Mutual_Funds': 'Mutual Funds',
  'Commodities': 'Commodities',
  'Crypto_Assets': 'Cryptocurrency',
  'REIT': 'REITs',
  'Gold_Investments': 'Gold',
  'Forex': 'Foreign Exchange'
};

export const UNLOCK_TIMELINE = [
  { year: 0, type: 'savings', message: 'Savings Account ready' },
  { year: 1, type: 'fixedDeposits', message: 'Fixed Deposits now available' },
  { year: 2, type: 'gold', message: 'Gold investment unlocked' },
  { year: 3, type: 'stocks', message: 'Stock market access unlocked' },
  // Years 5-7 are for random assets
];