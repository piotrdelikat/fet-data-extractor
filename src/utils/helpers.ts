import fs from 'fs';
export function importMarkdownFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return fileContent;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isTextMeaningful = (filePath: string): boolean => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the content is mostly printable ASCII characters
  const printableRatio = content.split('').filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126).length / content.length;
  
  // Check if there's a minimum amount of text
  const minLength = 100;
  
  // You can adjust these thresholds as needed
  return content.length >= minLength && printableRatio > 0.8;
};
export const clearJsonEnds = (response: string): string => {
  return response.replace(/^[^{]*|[^}]*$/g, '');
};

export const requestController: any = async (request: Promise<any>, logText: string, maxRetries: number = 3, baseTimeout: number = 60000) => {
  console.log(`Request: ${logText} started`);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const currentTimeout = baseTimeout * Math.pow(2, attempt - 1); // Exponential growth

    const timer = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(`Request ${logText} processing for ${elapsedTime} seconds (Attempt ${attempt}/${maxRetries})`);
    }, 10000);

    try {
      const result = await Promise.race([
        request,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), currentTimeout)
        )
      ]);

      clearInterval(timer);
      return result;
    } catch (error) {
      clearInterval(timer);
      if (attempt === maxRetries) {
        console.log(`All ${maxRetries} attempts failed. Giving up.`);
        throw new Error(`Request failed after ${maxRetries} attempts`);
      }
      console.log(`Request ${logText} failed (Attempt ${attempt}/${maxRetries}). Retrying with timeout ${currentTimeout / 1000} seconds...`);
    }
  }
};
