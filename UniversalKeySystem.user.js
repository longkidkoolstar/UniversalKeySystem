// Define API endpoints
const API_KEY_PART1 = "f08eaf62-13b5-48e9-8e63-";
const API_KEY_PART2 = "57c39df91167";
const API_KEY = API_KEY_PART1 + API_KEY_PART2;

const PROTOCOL = "https://";
const DOMAIN = "api.jsonstorage.net";
const VERSION = "/v1/";
const RESOURCE_TYPE = "/json/";
const UNIQUE_ID = "d206ce58-9543-48db-a5e4-997cfc745ef3/";

const BASE_URL = PROTOCOL + DOMAIN + VERSION + RESOURCE_TYPE + UNIQUE_ID;
const ID = "3ae8fcf7-dcb7-487c-8509-bf6b9259f043";
const GET_URL = BASE_URL + ID + "?apiKey=" + API_KEY;
const UPDATE_URL = BASE_URL + ID + "?apiKey=" + API_KEY;

// Helper functions
const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return await response.json();
};

const saveToLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getFromLocalStorage = (key) => JSON.parse(localStorage.getItem(key));
const removeFromLocalStorage = (key) => localStorage.removeItem(key);

const saveToSessionStorage = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
const getFromSessionStorage = (key) => JSON.parse(sessionStorage.getItem(key));
const removeFromSessionStorage = (key) => sessionStorage.removeItem(key);

const calculateExpiryDate = (startDate, duration) => {
  console.log(`Received duration format: ${duration}`);
  const expiryDate = new Date(startDate);
  const supportedUnits = ["d", "m", "y", "mi"]; // Supported units
  const unit = supportedUnits.find((u) => duration.endsWith(u)); // Check for valid unit
  const amount = parseInt(duration.slice(0, duration.length - (unit ? unit.length : 0)), 10); // Extract the numeric part

  if (!unit || isNaN(amount)) {
      throw new Error(`Invalid duration format: ${duration}. Supported formats are [number][unit], e.g., 1d, 2m, 1y, 15mi.`);
  }

  switch (unit) {
      case "d": // Days
          expiryDate.setDate(expiryDate.getDate() + amount);
          break;
      case "m": // Months
          expiryDate.setMonth(expiryDate.getMonth() + amount);
          break;
      case "y": // Years
          expiryDate.setFullYear(expiryDate.getFullYear() + amount);
          break;
      case "mi": // Minutes
          expiryDate.setMinutes(expiryDate.getMinutes() + amount);
          break;
      default: // Should never reach this due to the `find` above
          throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return expiryDate;
};



const updateKeyData = async (key, keyData) => {
    const payload = { keys: { [key]: keyData } };

    await fetchJSON(UPDATE_URL, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
};

const verifyKey = async (storedKey) => {
    try {
        const data = await fetchJSON(GET_URL);
        const keyData = data.keys[storedKey];

        if (!keyData) return false; // If the key does not exist

        const { duration, lastUsed } = keyData;
        const now = new Date();
        const lastUsedDate = lastUsed ? new Date(lastUsed) : null;

        if (duration !== "lifetime" && duration !== "inf") {
            const expiryDate = calculateExpiryDate(lastUsedDate || now, duration);
            if (now > expiryDate) {
                alert("Your key has expired. Please refresh or re-enter a new key.");

                // Mark the key as expired on the API
                keyData.expired = true; // Add an expired flag (you can name it whatever you prefer)

                // Update the key status in the API
                await updateKeyData(storedKey, keyData);

                // Remove the expired key from local storage
                removeFromLocalStorage("userKey");

                return false; // Key is expired
            }
        }

        // Update last used timestamp if the key is still valid
        keyData.lastUsed = now.toISOString();
        await updateKeyData(storedKey, keyData);

        return true; // Key is still valid
    } catch (error) {
        console.error("Error verifying key:", error);

        // Check if the error is due to a 500 Internal Server Error
        if (error.message.includes('500')) {
            console.log("Internal Server Error encountered. Please try again later.");
            location.reload(); // Refresh the page if an Internal Server Error occurs
            return false;
        }

        // If it's another type of error, return false
        return false;
    }
};

// Main Execution
(async () => {
    const refreshFlag = getFromSessionStorage("hasRefreshed");

    if (!refreshFlag) {
        let storedKey = getFromLocalStorage("userKey");

        if (!storedKey) {
            storedKey = prompt("Enter your key:");
            if (storedKey) saveToLocalStorage("userKey", storedKey);
        }

        if (storedKey) {
            const isValidKey = await verifyKey(storedKey);

            if (isValidKey) {
                saveToSessionStorage("hasRefreshed", true); // Set refresh flag
                location.reload(); // Refresh the page
            } else {
                alert("Invalid or expired key. Please try again.");
                removeFromLocalStorage("userKey");
            }
        }
    } else {
        removeFromSessionStorage("hasRefreshed"); // Clear refresh flag
        console.log("Key verified successfully. Executing main function...");
        window.main(); // Execute obfuscated main function
    }
})();
