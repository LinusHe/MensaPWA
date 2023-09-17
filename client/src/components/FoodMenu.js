/* eslint-disable react-hooks/exhaustive-deps */


// Import necessary libraries and components
import React, { useState, useEffect } from 'react';
import { Grow, Fade, Typography, Grid, Skeleton, Tabs, Tab, Chip } from '@mui/material';
import DishCard from './DishCard';
import { useSnackbar } from 'notistack';

// Main FoodMenu component
function FoodMenu() {
  // Define state variables
  const [dishes, setDishes] = useState([]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [error, setError] = useState(null);
  const [value, setValue] = useState(0);
  const [data, setData] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

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
    const timer = setTimeout(() => {
      setShowSkeleton(true);
    }, 500);
    // Fetch the dishes for the first date when the component mounts
    const url = `${process.env.PUBLIC_URL}/data/${dates[0]}/menu.json`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
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
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    const selectedDate = dates[newValue];
    const url = `${process.env.PUBLIC_URL}/data/${selectedDate}/menu.json`;

    // console.log('Fetching menu from:', url);
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
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
      <Grid item xs={12} sx={{ flexGrow: 1 }}>
        <Typography sx={{ pt: 2, pl: 2, pr: 2, pb: 1 }} variant="screenHeading">
          Speiseplan
        </Typography>
        {/* <Typography variant="p" fontWeight="regular" textTransform="uppercase">
          Heutige Gerichte
        </Typography> */}
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
            <Tab key={index}
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
          <div key={index} role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} aria-labelledby={`full-width-tab-${index}`} style={{ marginBottom: '120px' }}>
            {value === index && (
              <Grid container direction="row" justifyContent="center" alignItems="flex-start" alignContent="flex-start">
                {showSkeleton ? (
                  Array.from(new Array(5)).map((_, i) => (
                    <Grow timeout={500} key={`${i}`} in={true} style={{ width: '100%', transitionDelay: `${i * 50}ms` }}>
                      <Grid
                        alignItems={'center'}
                        container
                        sx={{
                          p: 2,
                          mx: 2,
                          my: 1.5,
                          backgroundColor: '#ffffff',
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
                              <Skeleton sx={{ mr: 1 }}>
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