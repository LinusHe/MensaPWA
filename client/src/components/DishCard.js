import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Chip, Grid, Typography } from '@mui/material';
import emptyPlate from '../assets/emptyPlate.png';
import smoothieImage from '../assets/smoothies.png';
import DishDetail from './DishDetail';
import { useTheme } from '@mui/material/styles';

import FishIcon from 'mdi-material-ui/Fish';
import VegetarianIcon from 'mdi-material-ui/Leaf';
import PorkIcon from 'mdi-material-ui/Pig';
import VeganIcon from 'mdi-material-ui/Leaf';
import ChickenIcon from 'mdi-material-ui/FoodDrumstick';
import BioIcon from 'mdi-material-ui/Tree';
import AlcoholIcon from 'mdi-material-ui/GlassCocktail';
import DefaultIcon from 'mdi-material-ui/Food';

const DishCard = ({ dishImage, category, title, chat_completion, prices, selections, additives, allergens }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const selectedPriceType = useSelector(state => state.selectedPriceType);

    const selectionMap = {
        "fish/seafood": { color: "food.fishSeafood", label: "Fisch/Meeresfrüchte", icon: FishIcon },
        "vegetarian": { color: "food.vegetarian", label: "Vegetarisch", icon: VegetarianIcon },
        "pork": { color: "food.pork", label: "Schweinefleisch", icon: PorkIcon },
        "vegan": { color: "food.vegan", label: "Vegan", icon: VeganIcon },
        "chicken": { color: "food.chicken", label: "Huhn", icon: ChickenIcon },
        "bio": { color: "food.bio", label: "Bio", icon: BioIcon },
        "alcohol": { color: "food.alcohol", label: "Alkohol", icon: AlcoholIcon },
        "default": { color: "food.default", label: "Andere", icon: DefaultIcon }
    };

    const handleOpen = () => {
        setOpen(true);
    };

    function onDismiss(event) {
        setOpen(false);
    }

    const handleClose = (event) => {
        event.stopPropagation();
        setOpen(false);
    };

    // Function to handle image loading errors
    const handleError = (e) => {
        // If an error occurs while loading the image, prevent further error triggers
        e.target.onerror = null;
        // Replace the image source with an empty plate image
        e.target.src = emptyPlate;
    }

    // Determine the source of the image based on the title or category of the dish
    const imageSrc = title.toLowerCase().includes('smoothie') || category.toLowerCase().includes('smoothie') ? smoothieImage : dishImage;

    // Initialize an empty string for additional title
    let additional_title = '';
    // Define a list of special words
    const specialWords = ['dazu', 'auf', 'mit', '&', 'oder'];
    // Check if the title includes a '|'
    if (title.includes('|')) {
        const splitTitle = title.split('|');
        title = splitTitle[0].trim();
        let additionalTitle = splitTitle.slice(1).join(',\n').trim(); // Join all remaining parts with ',' instead of '|'
        if (!specialWords.some(word => additionalTitle.toLowerCase().includes(word))) {
            additional_title = 'oder ' + additionalTitle.replace(/ ,/g, ','); // Replace all ' ,' with ','
        } else {
            additional_title = additionalTitle.replace(/ ,/g, ','); // Replace all ' ,' with ','
        }
        additional_title = additional_title.replace(/ , &/g, ' &'); // Replace ' , &' with ' &'
        additional_title = additional_title.replace(/, &/g, ' &'); // Replace ', &' with ' &'
    }
    // Remove any numbers enclosed in parentheses from the title
    title = title.replace(/\(\d+\)/g, '').trim();
    let additional_title_lines = additional_title.split('\n');

    return (
        
        <Grid
            onClick={handleOpen}
            alignItems={'center'}
            container
            sx={{
                p: 2,
                mx: 2,
                my: 1.5,
                backgroundColor: theme.palette.background.dishcard,
                boxShadow: `0px 0px 14px ${theme.palette.shadow.main}`,
                borderRadius: '15px',
                width: 'auto',
                cursor: 'pointer',
            }}
        >
            <Grid item xs={3.5}>
                <Grid container direction="column" justifyContent="center" alignItems="center">
                    <img onError={handleError} src={imageSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', clipPath: 'circle(42% at center)' }} />
                </Grid>
            </Grid>
            <Grid item xs={8.5} sx={{ pl: 2 }} alignSelf={'flex-start'}>
                <Grid sx={{ pb: 1 }} container direction="row" justifyContent="space-between" alignItems="flex-end">
                    <Typography variant="body" fontWeight={'400'} color="primary">
                        {category}
                    </Typography>
                    <Chip label={prices[selectedPriceType]} size="small" style={{ backgroundColor: theme.palette.background.priceChip, color: theme.palette.text.primary, fontWeight: 500 }} />
                </Grid>
                <Typography variant="h5" fontWeight={'500'} fontSize={'1.2rem'} sx={{ py: 0.5, mb: .5 }}>
                    {title}
                    {additional_title_lines.length > 0 && additional_title_lines.every(line => line.trim() !== '') &&
                        <Typography variant="p" fontWeight={'500'} fontSize={'1rem'}>
                            {/* Map each line to a JSX element */}
                            <br />
                            {additional_title_lines.map((line, index) => <React.Fragment key={index}>{line}<br /></React.Fragment>)}
                        </Typography>
                    }
                </Typography>
                {selections && selections.map((selection, index) => {
                    const selectionData = selectionMap[selection] || { ...selectionMap.default, label: selection };
                    const { color, label, icon: Icon } = selectionData;
                    return (
                        <Chip
                            key={index}
                            label={label}
                            variant="outlined"
                            icon={<Icon color={color} />}
                            size='small'
                            sx={{ borderColor: color, color: color, margin: '8px 8px 0px 0px' }}
                        />
                    );
                })}
                <DishDetail open={open} onDismiss={onDismiss} handleClose={handleClose} dish={{ imageSrc, category, title, additional_title_lines, chat_completion, prices, selections, selectionMap, additives, allergens }} />
            </Grid>
        </Grid >
    );
}

export default DishCard;