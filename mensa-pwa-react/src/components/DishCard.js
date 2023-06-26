import React from 'react';
import '../assets/DishCard.css';

const DishCard = ({dishImage, orangeText, mainText, smallText, price, bottomText}) => {
    return (
        <div className="dish-card">
            <img className="dish-image" src={dishImage} alt={mainText} />
            <div className="text-section">
                <p className="orange-text">{orangeText}</p>
                <h2 className="main-text">{mainText}</h2>
                <p className="small-text">{smallText}</p>
            </div>
            <div className="price-section">
                <p className="price-text">{price}</p>
            </div>
            <div className="bottom-section">
                <p className="bottom-text">{bottomText}</p>
            </div>
        </div>
    );
}

export default DishCard;
