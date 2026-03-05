import React from 'react'
import Navbar from './Navbar'
import { useAuth } from '../context/AuthContext'
import './DesignerCollectionsPage.css'
import './ProcessDiagramsPage.css'

const BpmnNode = ({ type, title, subtitle }) => {
  return (
    <div className={`bpmn-node bpmn-node--${type}`}>
      <div className="bpmn-node-title">{title}</div>
      {subtitle && <div className="bpmn-node-subtitle">{subtitle}</div>}
    </div>
  )
}

const BpmnSequenceFlow = () => (
  <div className="bpmn-sequence-flow" aria-hidden="true">
    <span className="bpmn-sequence-line" />
    <span className="bpmn-sequence-head" />
  </div>
)

const BpmnMessageFlow = ({ label }) => (
  <div className="bpmn-message-flow">
    <div className="bpmn-message-line">
      <span className="bpmn-message-dash" />
      <span className="bpmn-message-dash" />
      <span className="bpmn-message-dash" />
      <span className="bpmn-message-envelope">✉</span>
    </div>
    {label && <div className="bpmn-message-label">{label}</div>}
  </div>
)

const ProcessLane = ({ label, steps }) => {
  return (
    <div className="process-lane">
      <div className="process-lane-label">{label}</div>
      <div className="process-lane-steps">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className={`process-step process-step--${step.type || 'task'}`}>
              <div className="process-step-title">{step.title}</div>
              {step.subtitle && <div className="process-step-subtitle">{step.subtitle}</div>}
            </div>
            {index < steps.length - 1 && (
              <div className="process-arrow" aria-hidden="true">
                <span className="process-arrow-line" />
                <span className="process-arrow-head" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

const ProcessDiagramsPage = () => {
  const { user, profile } = useAuth()

  return (
    <div className="designer-page process-page">
      <Navbar />
      <div className="designer-content process-content">
        <section className="designer-card designer-card--hero process-hero">
          <div>
            <h2>Dijagrami procesa</h2>
            <p className="designer-subtitle">
              Vizuelni pregled ključnih procesa u Piccola ekosistemu – crtan po BPMN pravilima (start/end eventi,
              gateway‑i, sequence vs. message flow).
            </p>
          </div>
          {profile?.role && (
            <p className="process-hero-role">
              Prijavljeni ste kao: <strong>{profile.role}</strong> – dijagrami su informativni i isti za sve uloge.
            </p>
          )}
        </section>

        {!user && (
          <section className="designer-card process-card">
            <p className="designer-muted">
              Za detaljniji uvid u procese prijavite se u sistem. Dijagrami ispod su i dalje vidljivi, ali ne prate
              konkretne podatke iz baze već logiku implementiranu u kodu.
            </p>
          </section>
        )}

        {/* End‑to‑end prikaz u jednom procesu */}
        <section className="designer-card process-card">
          <h3>End‑to‑end BPMN: Dizajner → Dobavljač → Proizvođač → Krajnji kupac</h3>
          <p className="process-section-description">
            Jedan Pool predstavlja Piccola proces, Lanes predstavljaju uloge. Puna strelica je sequence flow, isprekidana
            linija sa kovertom je message flow između uloga / sistema.
          </p>

          <div className="bpmn-pool">
            <div className="bpmn-pool-header">Pool: Piccola proces od ideje do kupca</div>

            {/* Lane: Dizajner */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Modni dizajner</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="start"
                  title="Start: Nova ideja za model"
                  subtitle="Kreiran je koncept / skica u dizajnerskom panelu."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Definiši model i materijale"
                  subtitle="Naziv, SKU, BOM, paleta boja, varijante."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Pošalji zahtev za materijal"
                  subtitle="API kreira bundle zahteva prema dobavljaču."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="event-intermediate"
                  title="Čekaj odgovor dobavljača"
                  subtitle="Intermediate message event – čeka se prihvatanje ili odbijanje."
                />
              </div>
            </div>

            {/* Message flow Designer → Dobavljač */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Zahtev za materijal za konkretan model (BOM)" />
            </div>

            {/* Lane: Dobavljač materijala */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Dobavljač materijala</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="event-intermediate"
                  title="Primljen zahtev dizajnera"
                  subtitle="Intermediate message event – novi bundle u listi zahteva."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Proveri zalihe i rok"
                  subtitle="Poređenje tražene količine sa inventory‑jem."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="gateway-xor"
                  title="Ima dovoljno zaliha?"
                  subtitle="XOR gateway – da / ne."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Prihvati zahtev"
                  subtitle="Ažurira bundle na in_progress, priprema materijal."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Pošalji materijal proizvođaču"
                  subtitle="Kreira pošiljku; ako je uključen blockchain → createShipmentOnBlockchain."
                />
              </div>
            </div>

            {/* Message flow Dobavljač → Proizvođač */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Obaveštenje o poslatoj pošiljci + tracking" />
            </div>

            {/* Lane: Proizvođač */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Proizvođač</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="event-intermediate"
                  title="Materijal je stigao"
                  subtitle="Intermediate message event – pošiljka u tabu „Pristigli materijali“."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="gateway-xor"
                  title="Materijal ispravan?"
                  subtitle="Poređenje sa skicom i očekivanim materijalima."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Potvrdi prijem materijala"
                  subtitle="PATCH /shipments/:id/confirm, opciono acceptShipmentOnBlockchain."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Izvrši šivenje"
                  subtitle="Nalog prelazi u in_progress; radi se proizvodnja."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Završi šivenje"
                  subtitle="Complete nalog, doda se dokaz i (po potrebi) blockchain zapis."
                />
              </div>
            </div>

            {/* Message flow Proizvođač → Laboratorija */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Zahtev za laboratorijska testiranja materijala" />
            </div>

            {/* Lane: Laboratorija */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Laboratorija</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="event-intermediate"
                  title="Primljen uzorak za testiranje"
                  subtitle="Model ulazi u listu proizvoda koji čekaju testiranje (pending-tests)."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Izvedi testove materijala"
                  subtitle="Meri procenat i sastav materijala u laboratoriji."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Zabeleži rezultate testa"
                  subtitle="Unos rezultata preko /api/lab/verify-material."
                />
              </div>
            </div>

            {/* Message flow Laboratorija → Tester kvaliteta */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Rezultati laboratorijskih testova za model" />
            </div>

            {/* Lane: Tester kvaliteta */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Tester kvaliteta</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="event-intermediate"
                  title="Proizvod u fazi testiranja"
                  subtitle="Model prelazi u development_stage 'testing' i vidi se u Tester panelu."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Analiziraj testove i model"
                  subtitle="Poredi rezultate laboratorije, materijale, skicu i koncept."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="gateway-xor"
                  title="Proizvod prošao testiranje?"
                  subtitle="Ako ne – traži izmene dizajneru/proizvođaču."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Odobri proizvod (blockchain)"
                  subtitle="Poziva approveProductOnBlockchain i /api/tester/products/:id/approve."
                />
              </div>
            </div>

            {/* Message flow Tester → Dizajner / Web tim */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Model odobren za objavu u webshopu" />
            </div>

            {/* Lane: Dizajner / Web tim */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Dizajner / Web tim</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="task"
                  title="Pripremi webshop prikaz"
                  subtitle="Fotografije, opis, paleta, varijante i veličine."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Objavi model u prodavnici"
                  subtitle="Model postaje vidljiv krajnjim kupcima."
                />
              </div>
            </div>

            {/* Message flow prema krajnjem kupcu */}
            <div className="bpmn-message-row">
              <BpmnMessageFlow label="Model je objavljen i dostupan za kupovinu" />
            </div>

            {/* Lane: Krajnji kupac */}
            <div className="bpmn-lane">
              <div className="bpmn-lane-label">Krajnji kupac</div>
              <div className="bpmn-lane-row">
                <BpmnNode
                  type="task"
                  title="Pregled proizvoda i kolekcija"
                  subtitle="Home / Shop / New collections."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="task"
                  title="Kupi proizvod"
                  subtitle="Checkout kreira narudžbinu i pokreće logistiku."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="event-intermediate"
                  title="Čekaj isporuku"
                  subtitle="Logistika upravlja statusima isporuke i problemima."
                />
                <BpmnSequenceFlow />
                <BpmnNode
                  type="end"
                  title="End: Isporuka & lojalnost"
                  subtitle="Kupac prima proizvod, ulazi u loyalty/marketing tokove."
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProcessDiagramsPage

