import React from "react";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-container">
      {/* Seção Sobre o Jogo */}
      <section className="about-section">
        <h1>URBAN CLASH TEAM</h1>
        <div className="factions">
          <div className="gangsters">
            <h2>GANGSTERS</h2>
            <p>
              Os Gangsters prosperam no caos, usando táticas sujas e alianças
              perigosas para expandir seu território.
            </p>
          </div>
          <div className="guardas">
            <h2>GUARDAS</h2>
            <p>
              Os Guardas dependem de disciplina, trabalho em equipe e tecnologia
              avançada para combater a criminalidade.
            </p>
          </div>
        </div>

        <div className="objective">
          <h2>OBJETIVO PRINCIPAL</h2>
          <p>
            Você tem 20 dias para alcançar o maior nível possível e garantir sua
            posição entre os 3 primeiros colocados do ranking da sua facção ou
            liderar o melhor clã do servidor!
          </p>
        </div>
      </section>

      {/* Linha do Tempo */}
      <section className="timeline-section">
        <h2>LINHA DO TEMPO - 20 DIAS</h2>
        <div className="timeline">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="timeline-day">
              <span>Dia {i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rankings */}
      <section className="rankings-section">
        <div className="gangsters-rank">
          <h2>TOP 5 GANGSTERS</h2>
          <ol>
            {[...Array(5)].map((_, i) => (
              <li key={i}>Posição {i + 1}</li>
            ))}
          </ol>
        </div>

        <div className="guardas-rank">
          <h2>TOP 5 GUARDAS</h2>
          <ol>
            {[...Array(5)].map((_, i) => (
              <li key={i}>Posição {i + 1}</li>
            ))}
          </ol>
        </div>

        <div className="clans-rank">
          <h2>TOP 5 CLÃS</h2>
          <ol>
            {[...Array(5)].map((_, i) => (
              <li key={i}>Posição {i + 1}</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};

export default Home;
