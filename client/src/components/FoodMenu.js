// Import necessary libraries and components
import React, { useState, useEffect } from 'react';
import { Grid, CircularProgress, AppBar, Tabs, Tab } from '@mui/material';
import DishCard from './DishCard';
import SwipeableViews from 'react-swipeable-views';
import { useTheme } from '@mui/material/styles';

// Main FoodMenu component
function FoodMenu() {
  // Define state variables
  const [dishes, setDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [value, setValue] = useState(0);
  const [data, setData] = useState([]);

  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0]; // Format the date as 'YYYY-MM-DD'
  });

  useEffect(() => {
    // Fetch the dishes for the first date when the component mounts
    const url = `${process.env.PUBLIC_URL}/data/${dates[0]}/menu.json`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setDishes(data);
      })
      .catch((error) => {
        console.error('Error fetching menu:', error);
        setError(error);
      });
    Promise.all(dates.map(date => {
      const url = `${process.env.PUBLIC_URL}/data/${date}/menu.json`;
      return fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .catch(error => {
          console.log(`No data for date ${date} (mensa may be closed)`);
          // Return null if there was an error fetching the data
          return null;
        });
    }))
      .then(data => {
        console.log('Fetched data:', data);
        setData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching dates:', error);
        setError(error);
        setIsLoading(false);
      });
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    const selectedDate = dates[newValue];
    const url = `${process.env.PUBLIC_URL}/data/${selectedDate}/menu.json`;

    console.log('Fetching menu from:', url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setDishes(data);
      })
      .catch((error) => {
        console.error('Error fetching menu:', error);
        setError(error);
      });
  };

  // Show loading spinner if data is still loading
  if (isLoading) {
    return <CircularProgress />;
  }

  // Show error message if there was an error fetching data
  if (error) {
    return <p>Error: {error.toString()}</p>;
  }

  // Function to generate accessibility props for tabs
  function a11yProps(index) {
    return {
      id: `full-width-tab-${index}`,
      'aria-controls': `full-width-tabpanel-${index}`,
    };
  }

  // Render the component
  return (
    <div>
      <Tabs value={value} onChange={handleChange} variant="fullWidth" >
        {dates.map((date, index) => (
          <Tab key={index} label={date} {...a11yProps(index)} disabled={data[index] === null} />
        ))}
      </Tabs>
      <SwipeableViews index={value} onChangeIndex={handleChange}>
        {dates.map((date, index) => (
          <div key={index} role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} aria-labelledby={`full-width-tab-${index}`}>
            {value === index && (
              <Grid container direction="row" justifyContent="center" alignItems="flex-start" alignContent="flex-start">
                {dishes.map((dish, i) => (
                  <DishCard
                    key={`${date}-${dish.id}-${i}`} // Use the dish id and index as part of the key
                    dishImage={`${process.env.PUBLIC_URL}/data/${date}/${dish.imageUrl}`} // Use the image number as the filename
                    orangeText={dish.category}
                    mainText={dish.title}
                    smallText={dish.chat_completion} // Join the selections array into a string
                    price={dish.prices.student} // Use the student price as an example
                    bottomText={dish.selections ? dish.selections.join(', ') : ''} // Use the chat completion as an example
                  />
                ))}
              </Grid>
            )}
          </div>
        ))}
      </SwipeableViews>
    </div>
  );
}

// Export the component
export default FoodMenu;