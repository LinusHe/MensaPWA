/* eslint-disable react-hooks/exhaustive-deps */
// Import necessary libraries and components
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ToggleButton, Grow, Fade, Typography, Grid, Skeleton, Tabs, Tab, Chip } from '@mui/material';
import DishCard from './DishCard';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import VeganIcon from 'mdi-material-ui/Leaf';

// Main FoodMenu component
function FoodMenu() {
  const theme = useTheme();
  const dispatch = useDispatch();

  // Define state variables
  const [dishes, setDishes] = useState([]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError] = useState(null);
  const [value, setValue] = useState(0);
  const [data, setData] = useState([]);
  const { enqueueSnackbar } = useSnackbar();
  const initialVeganFirst = useSelector(state => state.veganFirst);
  const [veganFirst, setVeganFirst] = useState(initialVeganFirst);

  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0]; // Format the date as 'YYYY-MM-DD'
  });

  // Create an array of weekday names
  const weekdays = dates.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { weekday: 'long' }); // Get the weekday name in German
  });

  useEffect(() => {
    console.log(veganFirst)
    const timer = setTimeout(() => {
      setShowSkeleton(true);
    }, 500);
    // Fetch the dishes for the first date when the component mounts
    const url = `${process.env.PUBLIC_URL}/data/${dates[value]}/menu.json`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (veganFirst) {
          data.sort((a, b) => {
            const aIsVeganOrVegetarian = a.selections && (a.selections.includes('vegan') || a.selections.includes('vegetarian'));
            const bIsVeganOrVegetarian = b.selections && (b.selections.includes('vegan') || b.selections.includes('vegetarian'));
            if (aIsVeganOrVegetarian && !bIsVeganOrVegetarian) {
              return -1;
            }
            if (!aIsVeganOrVegetarian && bIsVeganOrVegetarian) {
              return 1;
            }
            return 0;
          });
        }
        console.log(...data)
        setDishes(data);
        clearTimeout(timer);
        setShowSkeleton(false);
      })
      .catch((error) => {
        const day = new Date().getDay();
        if (day === 6 || day === 0) {
          const germanDay = day === 6 ? 'Samstag' : 'Sonntag';
          enqueueSnackbar(`Heute ist ${germanDay}, die Mensa hat vermutlich geschlossen. In der Tab Leiste kannst du schauen, ob die Speisen für nächste Woche verfügbar sind.`, { variant: 'info', preventDuplicate: true });
        } else {
          enqueueSnackbar(`Mensa Menü konnte nicht abgerufen werden. Vielleicht hat die Mensa geschlossen...`, { variant: 'info', preventDuplicate: true });
        }
        clearTimeout(timer);
        setShowSkeleton(true);
      });
    Promise.all(dates.map(date => {
      const url = `${process.env.PUBLIC_URL}/data/${date}/menu.json`;
      return fetch(url)
        .then(response => {
          if (!response.ok) {
            const error = new Error('Network response was not ok');
            enqueueSnackbar(`Network Error: ${error.message}`, { variant: 'error' });
            throw error;
          }
          return response.json();
        })
        .catch(error => {
          const currentDate = new Date().toISOString().split('T')[0];
          if (date === currentDate) {
            console.log(`No data for date ${date} (mensa may be closed)`);
          }
          // Return null if there was an error fetching the data
          return null;
        });
    }))
      .then(data => {
        setData(data);
      })
      .catch(error => {
        console.error('Error fetching dates:', error);
        clearTimeout(timer);
        setShowSkeleton(true);
      });
    return () => clearTimeout(timer);
  }, [veganFirst]);

  const handleVeganFirstChange = () => {
    const newVeganFirst = !veganFirst;
    setVeganFirst(newVeganFirst);
    dispatch({ type: 'SET_VEGAN_FIRST', payload: newVeganFirst });
    enqueueSnackbar(newVeganFirst ? 'Vegetarische und vegane Gerichte werden zuerst angezeigt.' : 'Sortierung aufgehoben', { variant: newVeganFirst ? 'success' : 'info' });
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
    const selectedDate = dates[newValue];
    const url = `${process.env.PUBLIC_URL}/data/${selectedDate}/menu.json`;

    // console.log('Fetching menu from:', url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (veganFirst) {
          data.sort((a, b) => {
            const aIsVeganOrVegetarian = a.selections && (a.selections.includes('vegan') || a.selections.includes('vegetarian'));
            const bIsVeganOrVegetarian = b.selections && (b.selections.includes('vegan') || b.selections.includes('vegetarian'));
            if (aIsVeganOrVegetarian && !bIsVeganOrVegetarian) {
              return -1;
            }
            if (!aIsVeganOrVegetarian && bIsVeganOrVegetarian) {
              return 1;
            }
            return 0;
          });
        }
        setDishes(data);
        setShowSkeleton(false);
      })
      .catch((error) => {
        enqueueSnackbar(`Error fetching menu: ${error.message}`, { variant: 'error' });
        setShowSkeleton(true);
        setError(error);
      });
  };

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
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="flex-start"
      alignContent="flex-start"
      rowSpacing={0}
      columnSpacing={0}
      className='fullHeight'
      sx={{ overflow: 'hidden', width: '100%', maxWidth: '720px', mx: 'auto' }}
    >
      <Grid container justifyContent="space-between" alignItems="center" sx={{ pt: 2, pl: 2, pr: 2, pb: 1 }}>
        <Typography variant="screenHeading" sx={{ fontSize: '2.5rem', pb: 0 }}>
          Speiseplan
        </Typography>
        <ToggleButton
          value="check"
          selected={veganFirst}
          onChange={handleVeganFirstChange}
          sx={{
            height: '42px',
            width: '42px',
            boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.08)',
            borderRadius: '50%',
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'background.paper',
            },
            color: veganFirst ? theme.palette.food.vegan : undefined,
            borderColor: veganFirst ? `${theme.palette.food.vegan}60` : undefined,
            '&.Mui-selected': {
              color: theme.palette.food.vegan,
              backgroundColor: 'rgb(69 255 76 / 20%)',
              '&:hover': {
                backgroundColor: 'rgb(69 255 76 / 20%)',
              }
            },
          }}
        >
          <VeganIcon />
        </ToggleButton>
      </Grid>

      <Grid item xs={12} sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 144px)' }}> {/* Adjust the maxHeight value as needed */}
        {/* TAB HEADER */}
        <Tabs value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }}
          sx={{
            pb: 2,
            '& .MuiTabs-scrollButtons': { width: '30px' },
            '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: '.3' },
            '& .MuiTabs-indicator': {
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'transparent'
            },
            '& .MuiTabs-indicatorSpan': {
              maxWidth: 40,
              width: '100%',
              backgroundColor: 'primary.main',
            }
          }}
        >
          {weekdays.map((weekday, index) => (
            <Tab key={weekday}
              label={
                <div>
                  <div>{weekday}</div>
                  <div style={{ fontSize: 'smaller' }}>{dates[index].slice(8, 10) + '.' + dates[index].slice(5, 7)}</div>
                </div>
              }
              {...a11yProps(index)}
              disabled={data[index] === null}
            />
          ))}
        </Tabs>

        {/* TAB CONTENT */}
        {dates.map((date, index) => (
          <div key={date} role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} aria-labelledby={`full-width-tab-${index}`} style={{ marginBottom: '120px' }}>
            {value === index && (
              <Grid container direction="row" justifyContent="center" alignItems="flex-start" alignContent="flex-start">
                {showSkeleton ? (
                  Array.from(new Array(5)).map((_, i) => (
                    <Grow timeout={500} key={i} in={true} style={{ width: '100%', transitionDelay: `${i * 50}ms` }}>
                      <Grid
                        alignItems={'center'}
                        container
                        sx={{
                          p: 2,
                          mx: 2,
                          my: 1.5,
                          backgroundColor: theme.palette.background.dishcard,
                          boxShadow: '0px 0px 14px #00000012',
                          borderRadius: '15px',
                          width: '100%',
                        }}
                        alignContent="stretch"
                      >
                        <Grid item xs={3.5}>
                          <Grid container direction="column" justifyContent="center" alignItems="center">
                            <Skeleton variant="circular" width={80} height={80} >
                            </Skeleton>
                          </Grid>
                        </Grid>
                        <Grid item xs={8.5} sx={{ pl: 2 }} alignSelf={'flex-start'}>
                          <Grid sx={{ pb: 1 }} container direction="row" justifyContent="space-between" alignItems="flex-end">
                            <Skeleton variant="text" width={`${Math.floor(Math.random() * 40) + 40}%`} />
                            <Skeleton>
                              <Chip label="2.20€" size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500 }} />
                            </Skeleton>
                          </Grid>
                          {[...Array(Math.floor(Math.random() * 2) + 1)].map((_, i) => (
                            <Skeleton variant="text" width={`${Math.floor(Math.random() * 40) + 30}%`} key={i} />
                          ))}
                          <Grid key={i} sx={{ pt: 1 }} container direction="row" >
                            {[...Array(Math.floor(Math.random() * 3) + 1)].map((_, i) => (
                              <Skeleton key={i} sx={{ mr: 1 }}>
                                <Chip label={Math.random().toString(36).substring(2, 7)} size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500, }} />
                              </Skeleton>
                            ))}
                          </Grid>

                        </Grid>


                      </Grid>

                    </Grow>
                  ))
                ) : (
                  dishes && dishes.length > 0 && dishes.map((dish, i) => (
                    <Fade key={`${date}-${dish.id}-${i}`} in={true} timeout={800} style={{ width: '100%', transitionDelay: `${i * 50}ms` }}>
                      {/* <Grow timeout={500} key={`${date}-${dish.id}-${i}`} in={true} style={{ width: '100%', transitionDelay: `${i * 50}ms` }}> */}
                      <div>
                        <DishCard
                          // Use the dish id and index as part of the key
                          dishImage={`${process.env.PUBLIC_URL}/data/${date}/${dish.imageUrl}`} // Use the image number as the filename
                          category={dish.category}
                          title={dish.title}
                          chat_completion={dish.chat_completion} // Join the selections array into a string
                          prices={dish.prices} // Use the student price as an example
                          selections={dish.selections} // Use the chat completion as an example
                          additives={dish.additives}
                          allergens={dish.allergens}
                        />
                      </div>
                      {/* </Grow> */}
                    </Fade>
                  ))
                )}
              </Grid>
            )}
          </div>
        ))}
      </Grid>
    </Grid >
  );
}

// Export the component
export default FoodMenu;