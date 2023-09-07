/**
 * This function generates all valid codes.
 * A valid code is a combination of a first letter, a number, and a last letter.
 * The first letter can be 'N', 'S', or 'M'.
 * The number can be from 1 to 12 for 'N' and 'S', and 0 to 3 for 'M'.
 * The last letter can be 'A' or 'I' for 'N' and 'S', and 'N' or 'S' for 'M'.
 * Example: 'N1A', 'S12I', 'M0N', 'M3S' are valid codes.
 */
export const generateValidCodes = () => {
  const firstLetters = ['N', 'S', 'M'];
  const numbers = {
    'N': Array.from({ length: 12 }, (_, i) => i + 1),
    'S': Array.from({ length: 12 }, (_, i) => i + 1),
    'M': [0, 1, 2, 3],
  };
  const lastLetters = {
    'N': ['A', 'I'],
    'S': ['A', 'I'],
    'M': ['N', 'M', 'S'],
  };

  let combinations = [];
  firstLetters.forEach(firstLetter => {
    numbers[firstLetter].forEach(number => {
      lastLetters[firstLetter].forEach(lastLetter => {
        combinations.push(firstLetter + number + lastLetter);
      });
    });
  });

  return combinations;
}

/**
 * This function checks if a code is valid.
 * It ignores the case of the code.
 * Example: 'n1a', 'S12i', 'M0n', 'm3S' are considered valid.
 */
export const isValidCode = (code) => {
  const combinations = generateValidCodes();
  return combinations.includes(code.toUpperCase());
}