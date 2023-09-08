import React, { useState, useEffect } from 'react';
import { Grid, Typography, CircularProgress } from '@mui/material';
import DishCard from './DishCard';
function generateSafeTitle(title) {
  const safe_title = title.replace(/[^\wäöüß]+/gi, '_');
  console.log(`Generated safe_title: ${safe_title}`);
  return safe_title;
}




  function FoodMenu() {
    const [dishes, setDishes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
  
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JavaScript
    const day = String(date.getDate()).padStart(2, '0');
  
    useEffect(() => {
      fetch(`${process.env.PUBLIC_URL}/out/${year}-${month}-${day}/menu.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Error fetching menu');
          }
          return response.json();
        })
        .then(data => {
          setDishes(data);
          setIsLoading(false);
        })
        .catch(error => {
          setError(error.message);
          setIsLoading(false);
        });
    }, [year, month, day]);
  
    if (isLoading) {
      return <CircularProgress />;
    }
  
    if (error) {
      return <p>Error: {error}</p>;
    }

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      alignContent="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      sx={{ maxHeight: 'calc(100vh - 80px)', overflow: 'scroll', width: '100%' }}
    >
      <Grid item xs={12} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="screenHeading">
          Speiseplan
        </Typography>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Heutige Gerichte
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={6} lg={4} sx={{ flexGrow: 1 }}>
        {dishes.map((dish, index) => (
          <DishCard 
            key={index}
            dishImage={`${process.env.PUBLIC_URL}/out/${year}-${month}-${day}/${generateSafeTitle(dish.title)}.jpg`} // Use the formatted title as the filename
            orangeText={dish.category} 
            mainText={dish.title} 
            smallText={dish.chat_completion} // Join the selections array into a string
            price={dish.prices.student} // Use the student price as an example
            bottomText={dish.selections ? dish.selections.join(', ') : ''} // Use the chat completion as an example
          />
        ))}
      </Grid>
    </Grid>
  );
}

export default FoodMenu;