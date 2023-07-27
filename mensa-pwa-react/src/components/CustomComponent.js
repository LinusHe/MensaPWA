import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

function CustomComponent() {
  const { code } = useParams();

  const [isValid, setIsValid] = React.useState(true); // Initialize to true so that it doesn't redirect before checking

  React.useEffect(() => {
    // Define valid characters for each position
    const firstLetters = ['N', 'S', 'M'];
    const numbers = {
      'N': Array.from({ length: 12 }, (_, i) => i + 1),
      'S': Array.from({ length: 12 }, (_, i) => i + 1),
      'M': [0, 1, 2, 3],
    };
    const lastLetters = {
      'N': ['A', 'I'],
      'S': ['A', 'I'],
      'M': ['N', 'S'],
    };

    // Generate all valid combinations
    let combinations = [];
    firstLetters.forEach(firstLetter => {
      numbers[firstLetter].forEach(number => {
        lastLetters[firstLetter].forEach(lastLetter => {
          combinations.push(firstLetter + number + lastLetter);
        });
      });
    });

    // Log all combinations and whether they match the current code
    combinations.forEach(combination => {
      console.log(`Combination: ${combination}, Matches: ${combination === code}`);
    });

    // Check if the code is valid
    if (combinations.includes(code)) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [code]);

  if (!isValid) {
    // Redirect to home page or any error page if the code is not valid
    return <Navigate to="/" />;
  }

  // If code is valid, render the desired content
  return <div>Valid Code: {code}</div>;
}

export default CustomComponent;
