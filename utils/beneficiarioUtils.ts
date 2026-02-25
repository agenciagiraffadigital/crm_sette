import { TipoDependente, TIPOS_DEPENDENTE } from '../types';

export const getTipoDependenteLabel = (tipo: TipoDependente | string): string => {
  const found = TIPOS_DEPENDENTE.find(t => t.value === tipo);
  return found ? found.label : tipo;
};

export const getTipoBeneficiarioLabel = (tipo: 'TITULAR' | 'DEPENDENTE'): string => {
  return tipo === 'TITULAR' ? 'Titular' : 'Dependente';
};