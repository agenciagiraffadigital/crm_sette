// Máscaras para inputs de telefone, CPF e RG

export const maskPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return cleaned
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // Celular com 9 dígitos: (XX) XXXXX-XXXX
    return cleaned
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  }
};

export const maskCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

export const maskCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

export const maskCPFOrCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 11) {
    return maskCPF(value);
  } else {
    return maskCNPJ(value);
  }
};

/**
 * Máscara para RG - Aceita diversos formatos brasileiros
 * Formatos suportados:
 * - XX.XXX.XXX-X (São Paulo e maioria dos estados)
 * - X.XXX.XXX (Alguns estados mais antigos)
 * - XXXXXXXX-X (Formato sem pontos)
 * - Aceita até 12 caracteres para RGs mais novos
 */
export const maskRG = (value: string): string => {
  const cleaned = value.replace(/[^\dXx]/g, '').toUpperCase();
  
  if (cleaned.length <= 8) {
    // Formato: X.XXX.XXX
    return cleaned
      .replace(/^(\d{1})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2');
  } else if (cleaned.length === 9) {
    // Formato: XX.XXX.XXX-X
    return cleaned
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1})$/, '$1-$2');
  } else {
    // Formato livre para RGs mais longos (até 12 caracteres)
    return cleaned.slice(0, 12);
  }
};

// Remove máscara para enviar ao backend
export const unmask = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Valida telefone (10 ou 11 dígitos)
export const validatePhone = (value: string): boolean => {
  const cleaned = unmask(value);
  return cleaned.length >= 10 && cleaned.length <= 11;
};

// Valida CPF
export const validateCPF = (value: string): boolean => {
  const cleaned = unmask(value);
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // Todos dígitos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

// Valida CNPJ
export const validateCNPJ = (value: string): boolean => {
  const cleaned = unmask(value);
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Valida RG (formato básico - apenas verifica se tem entre 7 e 12 caracteres)
export const validateRG = (value: string): boolean => {
  const cleaned = value.replace(/[^\dXx]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 12;
};
