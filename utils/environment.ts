export const getEnvironment = () => {
  // Detecta se está em desenvolvimento
  const isDev = typeof window !== 'undefined' ? (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev.settesaude.com.br')
  ) : (
    import.meta.env?.DEV || 
    import.meta.env?.MODE === 'development'
  );
  
  return {
    isDev,
    leadsTable: isDev ? 'leads_dev' : 'leads'
  };
};