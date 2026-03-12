import React from 'react';

const CityMap: React.FC = () => {
  return (
    <div className="flex-grow m-4 rounded-lg shadow-inner overflow-hidden relative">
      <img 
        src="/assets/city_map.jpg" 
        alt="Mapa da Cidade" 
        className="w-full h-full object-cover absolute top-0 left-0"
      />
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-20">
        {/* Futuramente, aqui poderemos adicionar os ícones dos territórios */}
      </div>
    </div>
  );
};

export default CityMap;