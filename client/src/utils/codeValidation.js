import floorPlanImage from '../assets/mensaplan.svg'

/**
 * Fetches an SVG floor plan image, parses it, and extracts all table elements.
 *
 * @async
 * @function getAllTablesFromSVG
 * @returns {Promise<string[]>} A promise that resolves to an array of table IDs.
 * @throws {Error} If there is an issue with fetching or parsing the SVG.
 */
export const getAllTablesFromSVG = async () => {
  const response = await fetch(floorPlanImage);
  const svgText = await response.text();
  const parser = new DOMParser();
  const svg = parser.parseFromString(svgText, 'image/svg+xml');
  const tables = svg.querySelectorAll("g > *[id*='Table']");
  return Array.from(tables).map(table => table.id);
}

/**
 * Converts table IDs by splitting each ID on underscores, removing the first part,
 * joining the remaining parts with hyphens, and replacing 'R' with 'S' and 'L' with 'N'.
 *
 * @param {string[]} tables - An array of table ID strings to be converted.
 * @returns {string[]} An array of converted table ID strings.
 */
export const convertTableIds = (tables) => {
  return tables.map(table => table.split('_').slice(1).join('-').replace(/R/g, 'S').replace(/L/g, 'N'));
}

/**
 * Validates the provided code by checking if it exists in the list of tables
 * obtained from the SVG.
 *
 * @param {string} code - The code to be validated.
 * @returns {Promise<boolean>} - A promise that resolves to true if the code is valid, otherwise false.
 */
export const isValidCode = (code) => {
  return getAllTablesFromSVG()
    .then((tables) => {
      tables = convertTableIds(tables);

      if (!tables || tables.length === 0) {
        console.error('No tables found in the SVG.');
        return false;  // No tables => invalid
      }

      if (tables.includes(code.toUpperCase())) {
        return true;
      } else {
        console.log('Check for old format');
        const oldFormat = tables.map(table => table.split('-').slice(0, -1).join('-'));
        if(oldFormat.includes(code.toUpperCase())) {
          return true;
        }
      }
      return false;
    })
    .catch((err) => {
      console.error(err);
      return false;
    });
};
