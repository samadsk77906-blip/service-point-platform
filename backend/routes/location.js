const express = require('express');
const router = express.Router();
const Garage = require('../models/Garage');

// Comprehensive India location data structure with all states and major cities
const indiaLocationData = {
  "Andhra Pradesh": {
    "Visakhapatnam": { "districts": ["Visakhapatnam", "Vizianagaram", "Srikakulam"] },
    "Vijayawada": { "districts": ["Krishna", "Guntur", "Prakasam"] },
    "Tirupati": { "districts": ["Chittoor", "YSR Kadapa", "Anantapur"] },
    "Rajahmundry": { "districts": ["East Godavari", "West Godavari"] },
    "Nellore": { "districts": ["Nellore", "SPSR Nellore"] },
    "Kurnool": { "districts": ["Kurnool", "Anantapur"] }
  },
  "Arunachal Pradesh": {
    "Itanagar": { "districts": ["Papum Pare", "Capital Complex"] },
    "Naharlagun": { "districts": ["Papum Pare"] },
    "Pasighat": { "districts": ["East Siang"] },
    "Tawang": { "districts": ["Tawang"] }
  },
  "Assam": {
    "Guwahati": { "districts": ["Kamrup Metropolitan", "Kamrup"] },
    "Silchar": { "districts": ["Cachar", "Karimganj", "Hailakandi"] },
    "Dibrugarh": { "districts": ["Dibrugarh", "Tinsukia"] },
    "Jorhat": { "districts": ["Jorhat", "Majuli"] },
    "Nagaon": { "districts": ["Nagaon", "Morigaon"] },
    "Tezpur": { "districts": ["Sonitpur"] }
  },
  "Bihar": {
    "Patna": { "districts": ["Patna", "Nalanda", "Jehanabad"] },
    "Gaya": { "districts": ["Gaya", "Aurangabad", "Nawada"] },
    "Bhagalpur": { "districts": ["Bhagalpur", "Banka"] },
    "Muzaffarpur": { "districts": ["Muzaffarpur", "Sitamarhi", "Sheohar"] },
    "Darbhanga": { "districts": ["Darbhanga", "Madhubani"] },
    "Purnia": { "districts": ["Purnia", "Katihar", "Araria"] }
  },
  "Chhattisgarh": {
    "Raipur": { "districts": ["Raipur", "Durg", "Bilaspur"] },
    "Bhilai": { "districts": ["Durg", "Rajnandgaon"] },
    "Korba": { "districts": ["Korba", "Janjgir-Champa"] },
    "Jagdalpur": { "districts": ["Bastar", "Kondagaon"] }
  },
  "Goa": {
    "Panaji": { "districts": ["North Goa", "Tiswadi"] },
    "Margao": { "districts": ["South Goa", "Salcete"] },
    "Vasco da Gama": { "districts": ["South Goa", "Mormugao"] },
    "Mapusa": { "districts": ["North Goa", "Bardez"] }
  },
  "Gujarat": {
    "Ahmedabad": { "districts": ["Ahmedabad", "Gandhinagar"] },
    "Surat": { "districts": ["Surat", "Tapi", "Navsari"] },
    "Vadodara": { "districts": ["Vadodara", "Chhota Udepur"] },
    "Rajkot": { "districts": ["Rajkot", "Morbi", "Jamnagar"] },
    "Bhavnagar": { "districts": ["Bhavnagar", "Amreli"] },
    "Jamnagar": { "districts": ["Jamnagar", "Devbhoomi Dwarka"] }
  },
  "Haryana": {
    "Gurugram": { "districts": ["Gurugram", "Mewat"] },
    "Faridabad": { "districts": ["Faridabad", "Palwal"] },
    "Panipat": { "districts": ["Panipat", "Karnal"] },
    "Ambala": { "districts": ["Ambala", "Kurukshetra"] },
    "Hisar": { "districts": ["Hisar", "Fatehabad", "Sirsa"] },
    "Rohtak": { "districts": ["Rohtak", "Jhajjar"] }
  },
  "Himachal Pradesh": {
    "Shimla": { "districts": ["Shimla", "Solan"] },
    "Dharamshala": { "districts": ["Kangra", "Chamba"] },
    "Kullu": { "districts": ["Kullu", "Mandi"] },
    "Solan": { "districts": ["Solan", "Sirmaur"] },
    "Hamirpur": { "districts": ["Hamirpur", "Bilaspur"] }
  },
  "Jharkhand": {
    "Ranchi": { "districts": ["Ranchi", "Khunti", "Lohardaga"] },
    "Jamshedpur": { "districts": ["East Singhbhum", "West Singhbhum"] },
    "Dhanbad": { "districts": ["Dhanbad", "Bokaro"] },
    "Bokaro": { "districts": ["Bokaro", "Ramgarh"] },
    "Deoghar": { "districts": ["Deoghar", "Dumka"] }
  },
  "Karnataka": {
    "Bangalore": { "districts": ["Bangalore Urban", "Bangalore Rural"] },
    "Mysore": { "districts": ["Mysore", "Mandya", "Chamarajanagar"] },
    "Hubli-Dharwad": { "districts": ["Dharwad", "Haveri"] },
    "Mangalore": { "districts": ["Dakshina Kannada", "Udupi"] },
    "Belgaum": { "districts": ["Belagavi", "Bagalkot"] },
    "Gulbarga": { "districts": ["Kalaburagi", "Yadgir"] }
  },
  "Kerala": {
    "Kochi": { "districts": ["Ernakulam", "Thrissur"] },
    "Thiruvananthapuram": { "districts": ["Thiruvananthapuram", "Kollam"] },
    "Kozhikode": { "districts": ["Kozhikode", "Wayanad"] },
    "Kottayam": { "districts": ["Kottayam", "Idukki"] },
    "Thrissur": { "districts": ["Thrissur", "Palakkad"] },
    "Kannur": { "districts": ["Kannur", "Kasaragod"] }
  },
  "Madhya Pradesh": {
    "Bhopal": { "districts": ["Bhopal", "Sehore"] },
    "Indore": { "districts": ["Indore", "Dhar"] },
    "Gwalior": { "districts": ["Gwalior", "Datia"] },
    "Jabalpur": { "districts": ["Jabalpur", "Katni"] },
    "Ujjain": { "districts": ["Ujjain", "Dewas"] },
    "Sagar": { "districts": ["Sagar", "Damoh"] }
  },
  "Maharashtra": {
    "Mumbai": { "districts": ["Mumbai City", "Mumbai Suburban"] },
    "Navi Mumbai": { "districts": ["Raigad", "Thane"] },
    "Thane": { "districts": ["Thane", "Palghar"] },
    "Pune": { "districts": ["Pune", "Satara"] },
    "Nagpur": { "districts": ["Nagpur", "Wardha"] },
    "Nashik": { "districts": ["Nashik", "Ahmednagar"] },
    "Aurangabad": { "districts": ["Aurangabad", "Jalna"] },
    "Solapur": { "districts": ["Solapur", "Osmanabad"] },
    "Amravati": { "districts": ["Amravati", "Yavatmal"] },
    "Kolhapur": { "districts": ["Kolhapur", "Sangli"] },
    "Sangli": { "districts": ["Sangli", "Satara"] },
    "Jalgaon": { "districts": ["Jalgaon", "Dhule"] },
    "Akola": { "districts": ["Akola", "Washim"] },
    "Latur": { "districts": ["Latur", "Osmanabad"] },
    "Ahmednagar": { "districts": ["Ahmednagar", "Pune"] },
    "Chandrapur": { "districts": ["Chandrapur", "Gadchiroli"] },
    "Dhule": { "districts": ["Dhule", "Nandurbar"] },
    "Satara": { "districts": ["Satara", "Sangli"] },
    "Beed": { "districts": ["Beed", "Aurangabad"] },
    "Ratnagiri": { "districts": ["Ratnagiri", "Sindhudurg"] }
  },
  "Manipur": {
    "Imphal": { "districts": ["Imphal East", "Imphal West"] },
    "Thoubal": { "districts": ["Thoubal", "Bishnupur"] },
    "Churachandpur": { "districts": ["Churachandpur"] },
    "Ukhrul": { "districts": ["Ukhrul"] }
  },
  "Meghalaya": {
    "Shillong": { "districts": ["East Khasi Hills", "West Khasi Hills"] },
    "Tura": { "districts": ["West Garo Hills", "South Garo Hills"] },
    "Jowai": { "districts": ["West Jaintia Hills", "East Jaintia Hills"] }
  },
  "Mizoram": {
    "Aizawl": { "districts": ["Aizawl", "Mamit"] },
    "Lunglei": { "districts": ["Lunglei", "Lawngtlai"] },
    "Champhai": { "districts": ["Champhai"] }
  },
  "Nagaland": {
    "Kohima": { "districts": ["Kohima", "Peren"] },
    "Dimapur": { "districts": ["Dimapur"] },
    "Mokokchung": { "districts": ["Mokokchung"] },
    "Tuensang": { "districts": ["Tuensang", "Mon"] }
  },
  "Odisha": {
    "Bhubaneswar": { "districts": ["Khordha", "Puri"] },
    "Cuttack": { "districts": ["Cuttack", "Jagatsinghpur"] },
    "Rourkela": { "districts": ["Sundargarh"] },
    "Berhampur": { "districts": ["Ganjam"] },
    "Sambalpur": { "districts": ["Sambalpur", "Bargarh"] }
  },
  "Punjab": {
    "Ludhiana": { "districts": ["Ludhiana", "Fatehgarh Sahib"] },
    "Amritsar": { "districts": ["Amritsar", "Tarn Taran"] },
    "Jalandhar": { "districts": ["Jalandhar", "Kapurthala"] },
    "Patiala": { "districts": ["Patiala", "Sangrur"] },
    "Bathinda": { "districts": ["Bathinda", "Mansa"] },
    "Mohali": { "districts": ["SAS Nagar", "Rupnagar"] }
  },
  "Rajasthan": {
    "Jaipur": { "districts": ["Jaipur", "Dausa"] },
    "Jodhpur": { "districts": ["Jodhpur", "Nagaur"] },
    "Udaipur": { "districts": ["Udaipur", "Rajsamand"] },
    "Kota": { "districts": ["Kota", "Bundi"] },
    "Bikaner": { "districts": ["Bikaner", "Hanumangarh"] },
    "Ajmer": { "districts": ["Ajmer", "Pushkar"] }
  },
  "Sikkim": {
    "Gangtok": { "districts": ["East Sikkim", "North Sikkim"] },
    "Namchi": { "districts": ["South Sikkim"] },
    "Gyalshing": { "districts": ["West Sikkim"] }
  },
  "Tamil Nadu": {
    "Chennai": { "districts": ["Chennai", "Kanchipuram"] },
    "Coimbatore": { "districts": ["Coimbatore", "Tirupur"] },
    "Madurai": { "districts": ["Madurai", "Theni"] },
    "Tiruchirappalli": { "districts": ["Tiruchirappalli", "Karur"] },
    "Salem": { "districts": ["Salem", "Namakkal"] },
    "Tirunelveli": { "districts": ["Tirunelveli", "Tenkasi"] }
  },
  "Telangana": {
    "Hyderabad": { "districts": ["Hyderabad", "Rangareddy"] },
    "Warangal": { "districts": ["Warangal Rural", "Warangal Urban"] },
    "Nizamabad": { "districts": ["Nizamabad", "Kamareddy"] },
    "Khammam": { "districts": ["Khammam", "Bhadradri Kothagudem"] },
    "Karimnagar": { "districts": ["Karimnagar", "Jagtial"] }
  },
  "Tripura": {
    "Agartala": { "districts": ["West Tripura", "Sepahijala"] },
    "Dharmanagar": { "districts": ["North Tripura", "Unakoti"] },
    "Udaipur": { "districts": ["Gomati"] },
    "Kailashahar": { "districts": ["Unakoti"] }
  },
  "Uttar Pradesh": {
    "Lucknow": { "districts": ["Lucknow", "Unnao"] },
    "Kanpur": { "districts": ["Kanpur Nagar", "Kanpur Dehat"] },
    "Ghaziabad": { "districts": ["Ghaziabad", "Hapur"] },
    "Agra": { "districts": ["Agra", "Mathura"] },
    "Meerut": { "districts": ["Meerut", "Baghpat"] },
    "Varanasi": { "districts": ["Varanasi", "Chandauli"] },
    "Allahabad": { "districts": ["Prayagraj", "Kaushambi"] },
    "Bareilly": { "districts": ["Bareilly", "Pilibhit"] }
  },
  "Uttarakhand": {
    "Dehradun": { "districts": ["Dehradun", "Tehri Garhwal"] },
    "Haridwar": { "districts": ["Haridwar"] },
    "Nainital": { "districts": ["Nainital", "Udham Singh Nagar"] },
    "Roorkee": { "districts": ["Haridwar"] },
    "Haldwani": { "districts": ["Nainital"] }
  },
  "West Bengal": {
    "Kolkata": { "districts": ["Kolkata", "Howrah"] },
    "Howrah": { "districts": ["Howrah", "Hooghly"] },
    "Durgapur": { "districts": ["Paschim Bardhaman", "Purba Bardhaman"] },
    "Asansol": { "districts": ["Paschim Bardhaman"] },
    "Siliguri": { "districts": ["Darjeeling", "Jalpaiguri"] },
    "Malda": { "districts": ["Malda", "Uttar Dinajpur"] }
  },
  "Delhi": {
    "New Delhi": { "districts": ["New Delhi", "Central Delhi"] },
    "Delhi": { "districts": ["North Delhi", "South Delhi", "East Delhi", "West Delhi"] }
  },
  "Puducherry": {
    "Puducherry": { "districts": ["Puducherry"] },
    "Karaikal": { "districts": ["Karaikal"] },
    "Mahe": { "districts": ["Mahe"] },
    "Yanam": { "districts": ["Yanam"] }
  },
  "Chandigarh": {
    "Chandigarh": { "districts": ["Chandigarh"] }
  },
  "Dadra and Nagar Haveli and Daman and Diu": {
    "Daman": { "districts": ["Daman"] },
    "Diu": { "districts": ["Diu"] },
    "Silvassa": { "districts": ["Dadra and Nagar Haveli"] }
  },
  "Lakshadweep": {
    "Kavaratti": { "districts": ["Lakshadweep"] }
  },
  "Ladakh": {
    "Leh": { "districts": ["Leh"] },
    "Kargil": { "districts": ["Kargil"] }
  },
  "Jammu and Kashmir": {
    "Srinagar": { "districts": ["Srinagar", "Budgam"] },
    "Jammu": { "districts": ["Jammu", "Samba"] },
    "Anantnag": { "districts": ["Anantnag", "Kulgam"] },
    "Baramulla": { "districts": ["Baramulla", "Kupwara"] }
  }
};

// World countries list
const worldCountries = [
  { name: 'Afghanistan', code: 'AF' },
  { name: 'Albania', code: 'AL' },
  { name: 'Algeria', code: 'DZ' },
  { name: 'Argentina', code: 'AR' },
  { name: 'Armenia', code: 'AM' },
  { name: 'Australia', code: 'AU' },
  { name: 'Austria', code: 'AT' },
  { name: 'Azerbaijan', code: 'AZ' },
  { name: 'Bahrain', code: 'BH' },
  { name: 'Bangladesh', code: 'BD' },
  { name: 'Belgium', code: 'BE' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Canada', code: 'CA' },
  { name: 'China', code: 'CN' },
  { name: 'Egypt', code: 'EG' },
  { name: 'France', code: 'FR' },
  { name: 'Germany', code: 'DE' },
  { name: 'India', code: 'IN' },
  { name: 'Indonesia', code: 'ID' },
  { name: 'Iran', code: 'IR' },
  { name: 'Iraq', code: 'IQ' },
  { name: 'Italy', code: 'IT' },
  { name: 'Japan', code: 'JP' },
  { name: 'Malaysia', code: 'MY' },
  { name: 'Mexico', code: 'MX' },
  { name: 'Nepal', code: 'NP' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Pakistan', code: 'PK' },
  { name: 'Russia', code: 'RU' },
  { name: 'Saudi Arabia', code: 'SA' },
  { name: 'Singapore', code: 'SG' },
  { name: 'South Korea', code: 'KR' },
  { name: 'Spain', code: 'ES' },
  { name: 'Sri Lanka', code: 'LK' },
  { name: 'Thailand', code: 'TH' },
  { name: 'Turkey', code: 'TR' },
  { name: 'United Arab Emirates', code: 'AE' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'United States', code: 'US' },
  { name: 'Vietnam', code: 'VN' }
];

// Sample states data for other countries
const worldStatesData = {
  'United States': [
    { name: 'California', code: 'CA' },
    { name: 'New York', code: 'NY' },
    { name: 'Texas', code: 'TX' },
    { name: 'Florida', code: 'FL' },
    { name: 'Illinois', code: 'IL' }
  ],
  'Canada': [
    { name: 'Ontario', code: 'ON' },
    { name: 'Quebec', code: 'QC' },
    { name: 'British Columbia', code: 'BC' },
    { name: 'Alberta', code: 'AB' }
  ],
  'Australia': [
    { name: 'New South Wales', code: 'NSW' },
    { name: 'Victoria', code: 'VIC' },
    { name: 'Queensland', code: 'QLD' },
    { name: 'Western Australia', code: 'WA' }
  ],
  'United Kingdom': [
    { name: 'England', code: 'ENG' },
    { name: 'Scotland', code: 'SCT' },
    { name: 'Wales', code: 'WLS' },
    { name: 'Northern Ireland', code: 'NIR' }
  ],
  'Germany': [
    { name: 'Bavaria', code: 'BY' },
    { name: 'Berlin', code: 'BE' },
    { name: 'Hamburg', code: 'HH' },
    { name: 'Hesse', code: 'HE' }
  ]
};

// @route   GET /api/location/countries
// @desc    Get list of world countries
// @access  Public
router.get('/countries', async (req, res) => {
  try {
    // Sort countries alphabetically
    const sortedCountries = worldCountries.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      data: sortedCountries
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching countries'
    });
  }
});

// @route   GET /api/location/states
// @desc    Get list of states for a country
// @access  Public
router.get('/states', async (req, res) => {
  try {
    const { country } = req.query;
    
    // For now, we only have data for India
    if (!country || country === 'India') {
      const states = Object.keys(indiaLocationData).sort().map(state => ({
        name: state,
        code: state.toUpperCase().replace(/\s+/g, '_')
      }));

      res.json({
        success: true,
        data: states
      });
    } else {
      // Check if we have sample data for this country
      if (worldStatesData[country]) {
        res.json({
          success: true,
          data: worldStatesData[country],
          message: `Sample states for ${country} (no garage data available yet)`
        });
      } else {
        // For other countries, return empty array
        res.json({
          success: true,
          data: [],
          message: `No state data available for ${country} yet.`
        });
      }
    }
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching states'
    });
  }
});

// @route   GET /api/location/states/:country
// @desc    Get list of states for a specific country
// @access  Public
router.get('/states/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    if (country === 'India') {
      const states = Object.keys(indiaLocationData).sort().map(state => ({
        name: state,
        code: state.toUpperCase().replace(/\s+/g, '_')
      }));

      res.json({
        success: true,
        data: states
      });
    } else {
      // Check if we have sample data for this country
      if (worldStatesData[country]) {
        res.json({
          success: true,
          data: worldStatesData[country],
          message: `Sample states for ${country} (no garage data available yet)`
        });
      } else {
        res.json({
          success: true,
          data: [],
          message: `No state data available for ${country} yet.`
        });
      }
    }
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching states'
    });
  }
});

// @route   GET /api/location/cities/:state
// @desc    Get list of cities for a specific state (comprehensive data)
// @access  Public
router.get('/cities/:state', async (req, res) => {
  try {
    const { state } = req.params;
    
    // Always use comprehensive static data for better user experience
    if (!indiaLocationData[state]) {
      return res.json({
        success: true,
        data: [],
        message: `No cities found for state: ${state}`
      });
    }

    const staticCities = Object.keys(indiaLocationData[state]).sort().map(city => ({
      name: city,
      code: city.toUpperCase().replace(/\s+/g, '_')
    }));

    res.json({
      success: true,
      data: staticCities,
      source: 'comprehensive'
    });
    
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities'
    });
  }
});

// @route   GET /api/location/districts/:state/:city
// @desc    Get list of districts for a specific city
// @access  Public
router.get('/districts/:state/:city', async (req, res) => {
  try {
    const { state, city } = req.params;
    
    if (!indiaLocationData[state] || !indiaLocationData[state][city]) {
      return res.status(404).json({
        success: false,
        message: 'State or city not found'
      });
    }

    const districts = indiaLocationData[state][city].districts.sort().map(district => ({
      name: district,
      code: district.toUpperCase().replace(/\s+/g, '_')
    }));

    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching districts'
    });
  }
});

// @route   GET /api/location/garages/search
// @desc    Search garages by location hierarchy
// @access  Public
router.get('/garages/search', async (req, res) => {
  try {
    const { state, city, district, service } = req.query;

    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State is required'
      });
    }

    const garages = await Garage.findByLocationHierarchy(state, city, district, service);

    res.json({
      success: true,
      count: garages.length,
      data: garages
    });
  } catch (error) {
    console.error('Error searching garages:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching garages'
    });
  }
});

// @route   POST /api/location/garages/nearby
// @desc    Find nearby garages using GPS coordinates
// @access  Public
router.post('/garages/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50, service } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be between -180 and 180'
      });
    }

    const garages = await Garage.findNearbyGarages(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseFloat(maxDistance), 
      service
    );

    res.json({
      success: true,
      count: garages.length,
      searchCriteria: {
        coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        maxDistance: parseFloat(maxDistance),
        service: service || 'All Services'
      },
      data: garages
    });
  } catch (error) {
    console.error('Error finding nearby garages:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding nearby garages'
    });
  }
});

// @route   GET /api/location/garages/states
// @desc    Get states from actual garage data
// @access  Public
router.get('/garages/states', async (req, res) => {
  try {
    const states = await Garage.getUniqueStates();
    
    res.json({
      success: true,
      data: states.sort().map(state => ({
        name: state,
        code: state.toUpperCase().replace(/\s+/g, '_')
      }))
    });
  } catch (error) {
    console.error('Error fetching garage states:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage states'
    });
  }
});

// @route   GET /api/location/garages/cities/:state
// @desc    Get cities from actual garage data for a specific state
// @access  Public
router.get('/garages/cities/:state', async (req, res) => {
  try {
    const { state } = req.params;
    const cities = await Garage.getUniqueCities(state);
    
    res.json({
      success: true,
      data: cities.sort().map(city => ({
        name: city,
        code: city.toUpperCase().replace(/\s+/g, '_')
      }))
    });
  } catch (error) {
    console.error('Error fetching garage cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage cities'
    });
  }
});

// @route   GET /api/location/garages/districts/:state/:city
// @desc    Get districts from actual garage data for a specific city
// @access  Public
router.get('/garages/districts/:state/:city', async (req, res) => {
  try {
    const { state, city } = req.params;
    const districts = await Garage.getUniqueDistricts(state, city);
    
    res.json({
      success: true,
      data: districts.sort().map(district => ({
        name: district,
        code: district.toUpperCase().replace(/\s+/g, '_')
      }))
    });
  } catch (error) {
    console.error('Error fetching garage districts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching garage districts'
    });
  }
});

module.exports = router;