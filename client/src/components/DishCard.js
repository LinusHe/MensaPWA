import React, { useState } from 'react';
import { Chip, Grid, Typography } from '@mui/material';
import emptyPlate from '../assets/emptyPlate.png';
import smoothieImage from '../assets/smoothies.png';
import DishDetail from './DishDetail';

const DishCard = ({ dishImage, category, title, chat_completion, price, selections }) => {
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = (event) => {
        event.stopPropagation();
        console.log('closed');
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
        <Grid onClick={handleOpen} alignItems={'center'} container sx={{ p: 2, mx: 2, my: 1.5, backgroundColor: '#ffffff', boxShadow: '0px 0px 14px #00000012', borderRadius: '15px', width: 'auto' }}>
            <Grid item xs={3.5} >
                <Grid container direction="column" justifyContent="center" alignItems="center">
                    <img onError={handleError} src={imageSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Grid>
            </Grid>
            <Grid item xs={8.5} sx={{ pl: 2 }} alignSelf={'flex-start'}>
                <Grid sx={{ pb: 1 }} container direction="row" justifyContent="space-between" alignItems="flex-end">
                    <Typography variant="body" fontWeight={'400'} color="primary">
                        {category}
                    </Typography>
                    <Chip label={price} size="small" style={{ backgroundColor: '#F2F4FF', color: "#202021", fontWeight: 500 }} />
                </Grid>
                <Typography variant="h5" fontWeight={'500'} fontSize={'1.2rem'} sx={{ py: 0.5 }}>
                    {title}
                    {additional_title_lines.length > 0 && additional_title_lines.every(line => line.trim() !== '') &&
                        <Typography variant="p" fontWeight={'500'} fontSize={'1rem'}>
                            {/* Map each line to a JSX element */}
                            <br />
                            {additional_title_lines.map((line, index) => <React.Fragment key={index}>{line}<br /></React.Fragment>)}
                        </Typography>
                    }
                </Typography>
                <Typography variant="body2" color="text.secondary" align="left" sx={{ pt: 1 }}>
                    {selections}
                </Typography>
                <DishDetail open={open} handleClose={handleClose} dish={{ imageSrc, category, title, additional_title_lines, chat_completion, price, selections }} />
            </Grid>
        </Grid >
    );
}

export default DishCard;