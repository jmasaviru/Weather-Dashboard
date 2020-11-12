$(document).ready(function () {

    // OpenWeather API
    const apiKey = '767baab1ba615005b7b57e268ed513fe';

    // Selectors for HTML elements to display weather information
    const cityEl = $('h2#city');
    const dateEl = $('h3#date');
    const weatherIconEl = $('img#weather-icon');
    const temperatureEl = $('span#temperature');
    const humidityEl = $('span#humidity');
    const windEl = $('span#wind');
    const uvIndexEl = $('span#uv-index');
    const cityListEl = $('div.cityList');

   // Selectors for form elements
   const cityInput = $('#city-input');

   // Store past searched cities
   let pastCities = [];

   // Helper function to sort cities from https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
   function compare(a, b) {
       // Use toUpperCase() to ignore character casing
       const cityA = a.city.toUpperCase();
       const cityB = b.city.toUpperCase();

       let comparison = 0;
       if (cityA > cityB) {
           comparison = 1;
       } else if (cityA < cityB) {
           comparison = -1;
       }
       return comparison;
   }

   // Local storage functions for past searched cities

    // Load events from local storage
    function loadCities() {
        const storedCities = JSON.parse(localStorage.getItem('pastCities'));
        if (storedCities) {
            pastCities = storedCities;
        }
    }

    // Store searched cities in local storage
    function storeCities() {
        localStorage.setItem('pastCities', JSON.stringify(pastCities));
    }

   // Functions to build the URL for the OpenWeather API call
 
    function buildURLFromInputs(city) {
        if (city) {
            return `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
        }
    }

    function buildURLFromId(id) {
        return `https://api.openweathermap.org/data/2.5/weather?id=${id}&appid=${apiKey}`;
    }

     // Function to display the last 5 searched cities
     function displayCities(pastCities) {
        cityListEl.empty();
        pastCities.splice(5);
        let sortedCities = [...pastCities];
        sortedCities.sort(compare);
        sortedCities.forEach(function (location) {
            let cityDiv = $('<div>').addClass('col-12 city');
            let cityBtn = $('<button>').addClass('btn btn-light city-btn').text(location.city);
            cityDiv.append(cityBtn);
            cityListEl.append(cityDiv);
        });
    }
    
    // Function to color the UV Index based on EPA color scale: https://www.epa.gov/sunsafety/uv-index-scale-0
    function setUVIndexColor(uvi) {
        if (uvi < 3) {
            return 'green';
        } else if (uvi >= 3 && uvi < 6) {
            return 'yellow';
        } else if (uvi >= 6 && uvi < 8) {
            return 'orange';
        } else if (uvi >= 8 && uvi < 11) {
            return 'red';
        } else return 'purple';
    }

    // Search for weather conditions by calling the OpenWeather API
    function searchWeather(queryURL) {

        // Create an AJAX call to retrieve weather data
        $.ajax({
            url: queryURL,
            method: 'GET'
        }).then(function (response) {

            // Store current city in past cities
            let city = response.name;
            let id = response.id;
            // Remove duplicate cities
            if (pastCities[0]) {
                pastCities = $.grep(pastCities, function (storedCity) {
                    return id !== storedCity.id;
                })
            }
            pastCities.unshift({ city, id });
            storeCities();
            displayCities(pastCities);
            
            // Display current weather in DOM elements
            cityEl.text(response.name);
            let formattedDate = moment.unix(response.dt).format('L');
            dateEl.text(formattedDate);
            let weatherIcon = response.weather[0].icon;
            weatherIconEl.attr('src', `http://openweathermap.org/img/wn/${weatherIcon}.png`).attr('alt', response.weather[0].description);
            temperatureEl.html(((response.main.temp - 273.15) * 1.8 + 32).toFixed(1));
            humidityEl.text(response.main.humidity);
            windEl.text((response.wind.speed * 2.237).toFixed(1));

            // Call OpenWeather API OneCall with lat and lon to get the UV index and 5 day forecast
            let lat = response.coord.lat;
            let lon = response.coord.lon;
            let queryURLAll = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}`;
            $.ajax({
                url: queryURLAll,
                method: 'GET'
            }).then(function (response) {
                let uvIndex = response.current.uvi;
                let uvColor = setUVIndexColor(uvIndex);
                uvIndexEl.text(response.current.uvi);
                uvIndexEl.attr('style', `background-color: ${uvColor}; color: ${uvColor === "yellow" ? "black" : "white"}`);
                let fiveDay = response.daily;

                // Display 5 day forecast in DOM elements
                for (let i = 0; i <= 5; i++) {
                    let currDay = fiveDay[i];
                    $(`div.day-${i} .card-title`).text(moment.unix(currDay.dt).format('L'));
                    $(`div.day-${i} .fiveDay-img`).attr(
                        'src',
                        `http://openweathermap.org/img/wn/${currDay.weather[0].icon}.png`
                    ).attr('alt', currDay.weather[0].description);
                    $(`div.day-${i} .fiveDay-temp`).text(((currDay.temp.day - 273.15) * 1.8 + 32).toFixed(1));
                    $(`div.day-${i} .fiveDay-humid`).text(currDay.humidity);
                }
            });
        });
    }

     // Function to display the last searched city
     function displayLastSearchedCity() {
        if (pastCities[0]) {
            let queryURL = buildURLFromId(pastCities[0].id);
            searchWeather(queryURL);
        } else {
            // if no past searched cities, load Detroit weather data
            let queryURL = buildURLFromInputs("Detroit");
            searchWeather(queryURL);
        }
    }
 
    // Click handler for search button
    $('#search-btn').on('click', function (event) {
        // Preventing the button from trying to submit the form
        event.preventDefault();

        // Retrieving and scrubbing the city from the inputs
        let city = cityInput.val().trim();
        city = city.replace(' ', '%20');

        // Clear the input fields
        cityInput.val('');

        // Build the query url with the city and searchWeather
        if (city) {
            let queryURL = buildURLFromInputs(city);
            searchWeather(queryURL);
        }
    }); 
    
    // Click handler for city buttons to load that city's weather
    $(document).on("click", "button.city-btn", function (event) {
        let clickedCity = $(this).text();
        let foundCity = $.grep(pastCities, function (storedCity) {
            return clickedCity === storedCity.city;
        })
        let queryURL = buildURLFromId(foundCity[0].id)
        searchWeather(queryURL);
    });

 // Initialization - when page loads

    // load any cities in local storage into array
    loadCities();
    displayCities(pastCities);

    // Display weather for last searched city
    displayLastSearchedCity();

});