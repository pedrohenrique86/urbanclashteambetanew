// Declaração de tipos para arquivos SVG na pasta assets
declare module '*.svg' {
  const content: string;
  export default content;
}

// Declaração do módulo assets para importação dos arquivos SVG
declare module 'assets' {
  const dashboardDesign: string;
  export { dashboardDesign };
  
  const duelsDesign: string;
  export { duelsDesign };
  
  const restaurantDesign: string;
  export { restaurantDesign };
  
  const taskDesign: string;
  export { taskDesign };
}