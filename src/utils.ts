
export function isValidNumericString(value: string) {  
    const num = Number(value);  
    return typeof value === 'string' && !Number.isNaN(num) && Number.isFinite(num);  
}  
export function isValidLetterString(value: string) {  
  const regex = /^[A-Za-z]+$/;
  return typeof value === 'string' && regex.test(value);  
}  

export function isValidNumberString(value: string) {  
  const regex = /^[+-]?\d+(\.\d{1,6})?$/;   
  return regex.test(value);  
}  
    
