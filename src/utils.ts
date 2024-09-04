
export function isValidNumericString(value: string) {  
    const regex = /^[1-9][0-9]*$/; 
    return typeof value === 'string' && regex.test(value);  
}  
export function isValidLetterString(value: string) {  
  const regex = /^[A-Za-z]+$/;
  return typeof value === 'string' && regex.test(value);  
}  

export function isValidNumberString(value: string) {  
  const regex = /^(0\.(0*[1-9]\d{0,5})|[1-9]\d*(\.\d{1,6})?)$/;   
  return typeof value === 'string' && regex.test(value);  
}  
    
