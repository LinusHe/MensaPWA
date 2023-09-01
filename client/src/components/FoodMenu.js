import React from 'react'
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import DishCard from './DishCard';
import testFoodPic from '../assets/test_foodpic.jpg';


function FoodMenu() {
  return (
    <Grid
    container
    direction="row"
    justifyContent="center"
    alignItems="flex-start"
    alignContent="flex-start"
    rowSpacing={0}
    columnSpacing={0}
    sx={{ maxHeight: 'calc(100vh - 80px)', overflow: 'scroll' }}
    >
      <Grid item xs={12} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="screenHeading">
          Speiseplan
        </Typography>
        <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Heutige Gerichte
        </Typography>
      </Grid>
      <Grid item xs={12} sx={{ flexGrow: 1 }}>
      
        <DishCard 
          dishImage={testFoodPic}
          orangeText="Vorspeise" 
          mainText="Tomatensuppe" 
          smallText="Mit frischen Kräutern" 
          price="2,30 €" 
          bottomText="vegetarisch"
        />
        <DishCard 
          dishImage={testFoodPic}
          orangeText="Hauptgericht" 
          mainText="Pasta Carbonara" 
          smallText="Mit Speck und Parmesan" 
          price="6,50 €" 
          bottomText=""
        />
        <DishCard 
          dishImage={testFoodPic}
          orangeText="Dessert" 
          mainText="Schokoladenkuchen" 
          smallText="Mit Vanillesoße" 
          price="3,20 €" 
          bottomText="vegan"
        />
        <DishCard 
          dishImage={testFoodPic}
          orangeText="Beilage" 
          mainText="Kartoffelpüree" 
          smallText="Mit Butter und Petersilie" 
          price="1,50 €" 
          bottomText="vegetarisch"
        />

      </Grid>
    </Grid>
  )
}

export default FoodMenu