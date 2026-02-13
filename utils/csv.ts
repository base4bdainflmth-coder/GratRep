export const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentToken += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of cell
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      // End of row
      if (currentToken || row.length > 0) {
        row.push(currentToken.trim());
        result.push(row);
      }
      row = [];
      currentToken = '';
      
      // Handle \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentToken += char;
    }
  }
  
  // Push last token
  if (currentToken || row.length > 0) {
    row.push(currentToken.trim());
    result.push(row);
  }

  return result;
};