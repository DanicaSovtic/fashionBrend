import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import './About.css'

const About = () => {
  return (
    <div className="about-page">
      <Navbar activePath="/about" />

      {/* Hero sekcija za About */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1 className="about-hero-title">O Piccola</h1>
          <p className="about-hero-subtitle">Gde se elegantnost susreće sa inovacijom</p>
        </div>
      </section>

      {/* Glavni sadržaj */}
      <div className="about-content">
        {/* Story sekcija */}
        <section className="about-section">
          <div className="about-container">
            <div className="about-text-block">
              <h2 className="about-heading">Naša Priča</h2>
              <p className="about-text">
                Piccola je nastao 2022. godine kao rezultat zajedničke vizije i saradnje profesorke Aleksandre Labus i dve studentkinje – Aleksandre Trpkov i Danice Sovtić. Upravo tada se prvi put razvila ideja o pokretanju modnog brenda koji neće pratiti isključivo estetske trendove, već će kroz primenu blokčejn tehnologije ponuditi novo, inovativno iskustvo kupcima i redefinisati odnos između mode, tehnologije i poverenja.




     </p>
              <p className="about-text">
               Brend je od samog početka zamišljen kao deo šireg digitalnog ekosistema, u kojem su transparentnost, autentičnost i inovacije ključne vrednosti. Ova vizija je dodatno potvrđena 2023. godine, kada je projekat „Blockchain ecosystem for the fashion industry“ osvojio drugo mesto na takmičenju W3 Algorand Hackathon 2023, čime je Piccola prepoznat kao pionirska ideja na preseku modne industrije i Web3 tehnologija.

              </p>
              <p className="about-text">
              Danas, Piccola predstavlja više od modnog brenda. To je platforma koja spaja kreativnu saradnju, savremeni dizajn i napredne tehnologije, sa ciljem da ponudi bezvremenske komade i istovremeno gradi budućnost mode zasnovanu na inovacijama, transparentnosti i novim digitalnim vrednostima.
              </p>
            </div>
            <div className="about-image-block">
              <div className="about-image-wrapper">
                <img 
                  src="/img/team-photo.jpg" 
                  alt="Piccola tim"
                  className="about-story-image"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission sekcija */}
        <section className="about-section about-section-dark">
          <div className="about-container">
            <div className="about-image-block">
              <div className="about-image-wrapper">
                <img 
                  src="/img/mision.jpeg" 
                  alt="Piccola misija"
                  className="about-story-image"
                />
              </div>
            </div>
            <div className="about-text-block">
              <h2 className="about-heading">Naša Misija</h2>
              <p className="about-text">
                Naša misija je da redefinišemo savremenu modnu industriju kroz spoj dizajna, tehnologije i inovacija. Piccola teži stvaranju modnog ekosistema koji prevazilazi klasičnu kupovinu, nudeći kupcima transparentnost, autentičnost i novo digitalno iskustvo zasnovano na blokčejn tehnologiji. Kroz svaki komad i svaku kolekciju gradimo poverenje, ističemo vrednost originalnosti i postavljamo nove standarde u načinu na koji moda komunicira sa svojim korisnicima.
              </p>
              {/* <p className="about-text">
                Istovremeno, naša misija je da podstaknemo saradnju između kreativne i tehnološke zajednice, osnažimo mlade talente i doprinesemo razvoju inovativnih rešenja u modnoj industriji. Verujemo u znanje, mentorski rad i kontinuirano učenje kao pokretače promena. Piccola vidi modu kao platformu za ideje, gde se estetika susreće sa tehnologijom, a vizija budućnosti pretvara u održivu i smisleno dizajniranu stvarnost.
              </p> */}
            </div>
          </div>
        </section>

        {/* Values sekcija */}
        <section className="about-section">
          <div className="about-container about-container-column">
            <h2 className="about-heading about-heading-center">Naše Vrednosti</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">✨</div>
                <h3 className="value-title">Kvalitet</h3>
                <p className="value-text">
                  Koristimo samo najfinije materijale i radimo sa veštim 
                  zanatlijama kako bismo osigurali da svaki komad ispunjava naše visoke standarde.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌱</div>
                <h3 className="value-title">Održivost</h3>
                <p className="value-text">
                  Posvećeni etičkim praksama i ekološkoj odgovornosti 
                  u svakom aspektu našeg procesa proizvodnje.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">🎨</div>
                <h3 className="value-title">Inovacija</h3>
                <p className="value-text">
                  Stalno pomeramo granice kako bismo stvorili sveže, moderne dizajne 
                  koji inspirišu i očaravaju.
                </p>
              </div>
              <div className="value-card">
                <div className="value-icon">❤️</div>
                <h3 className="value-title">Autentičnost</h3>
                <p className="value-text">
                  Ostanemo verni našoj viziji i vrednostima dok gradimo iskrene 
                  veze sa našom zajednicom.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA sekcija */}
        <section className="about-cta">
          <div className="about-cta-content">
            <h2 className="about-cta-title">Pridružite Nam Se</h2>
            <p className="about-cta-text">
              Otkrijte naše najnovije kolekcije i budite deo Piccola zajednice.
            </p>
            <Link to="/" className="about-cta-button">Istraži Kolekcije</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default About

