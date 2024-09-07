import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button, Table, Navbar, Nav, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function App() {
  const [possession, setPossession] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [patrimoineValeur, setPatrimoineValeur] = useState(0);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  const [selectedPossession, setSelectedPossession] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newDateFin, setNewDateFin] = useState(new Date());

  useEffect(() => {
    const doFetch = async () => {
      try {
        const response = await fetch("http://localhost:5000/possession");
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const json = await response.json();
        console.log("Data received from API:", json);
        setPossession(json.possessions);
        updateChart(json.possessions, startDate, endDate); 
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };
    doFetch();
  }, []);

  const updateChart = (possessions, startDate, endDate) => {
    const labels = possessions.map(p => p.libelle);
    const data = possessions.map(p => {
      const valeur = calculerValeurActuelle(p, moment(endDate));
      return valeur;
    });

    setChartData({
      labels,
      datasets: [
        {
          label: 'Valeur des Possessions',
          data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        }
      ]
    });
  };

  const calculerValeurActuelle = (possession, dateActuelle) => {
    const dateDebut = moment(possession.dateDebut);
    let valeurActuelle = possession.valeur;

    if (dateActuelle.isBefore(dateDebut)) {
      return 0;
    }
  
    if (possession.tauxAmortissement > 0) {
      const dureeUtilisee = dateActuelle.diff(dateDebut, 'years', true);
      valeurActuelle -= (possession.tauxAmortissement / 100) * dureeUtilisee * possession.valeur;
    } else if (possession.valeurConstante && possession.jour) {
      const joursPasses = dateActuelle.diff(dateDebut, 'days');
      const moisPasses = Math.floor(joursPasses / 30);
      valeurActuelle = possession.valeurConstante * moisPasses;
    }
  
    return Math.max(valeurActuelle, 0);
  };
  
  const calculerValeurPatrimoine = async () => {
    const dateActuelle = moment(endDate);
    let totalValeur = 0;

    const possessionsAvecValeurActuelle = possession.map(item => {
      const valeurActuelle = calculerValeurActuelle(item, dateActuelle);
      totalValeur += valeurActuelle;
      return { ...item, valeurActuelle };
    });

    setPossession(possessionsAvecValeurActuelle);
    setPatrimoineValeur(totalValeur);
    updateChart(possessionsAvecValeurActuelle, startDate, endDate); 
  };

  const handleModify = async () => {
    if (!selectedPossession) return;

    try {
      const response = await fetch(`http://localhost:5000/possession/${selectedPossession.libelle}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newLibelle: selectedPossession.libelle,
          valeur: selectedPossession.valeur,
          dateDebut: selectedPossession.dateDebut,
          dateFin: newDateFin ? moment(newDateFin).format('YYYY-MM-DD') : null,
          tauxAmortissement: selectedPossession.tauxAmortissement,
          valeurConstante: selectedPossession.valeurConstante,
          jour: selectedPossession.jour
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }

      const json = await response.json();
      setPossession(prev => prev.map(p => p.libelle === selectedPossession.libelle ? json : p));
      setShowModal(false); 
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    }
  };

  const handleClose = async (libelle) => {
    try {
      const response = await fetch(`http://localhost:5000/possession/${libelle}/close`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la clôture');
      }

      const json = await response.json();
      setPossession(prev => prev.map(p => p.libelle === libelle ? json : p));
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
    }
  };

  return (
    <Router>
      <Navbar bg="light" expand="lg">
        <Navbar.Brand as={Link} to="/">BudgetMaster</Navbar.Brand>
        <Nav className="mr-auto">
          <Nav.Link as={Link} to="/patrimoine">Patrimoine</Nav.Link>
          <Nav.Link as={Link} to="/possession">Possessions</Nav.Link>
        </Nav>
      </Navbar>

      <Routes>
        <Route path="/patrimoine" element={
          <div>
            <h1>Patrimoine</h1>
            <DatePicker selected={startDate} onChange={date => setStartDate(date)} />
            <DatePicker selected={endDate} onChange={date => setEndDate(date)} />
            <Button onClick={calculerValeurPatrimoine}>Calculer</Button>
            <h3>Valeur Totale: {patrimoineValeur}</h3>
            <Line data={chartData} />
          </div>
        } />

        <Route path="/possession" element={
          <div>
            <h1>Liste des Possessions</h1>
            <Button as={Link} to="/possession/create">Ajouter Nouvelle Possession</Button>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Libelle</th>
                  <th>Valeur</th>
                  <th>Date Début</th>
                  <th>Date Fin</th>
                  <th>Taux</th>
                  <th>Valeur Actuelle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {possession.map(item => (
                  <tr key={item.libelle}>
                    <td>{item.libelle}</td>
                    <td>{item.valeur}</td>
                    <td>{item.dateDebut}</td>
                    <td>{item.dateFin || 'N/A'}</td>
                    <td>{item.tauxAmortissement}</td>
                    <td>{calculerValeurActuelle(item, moment())}</td>
                    <td>
                      <Button onClick={() => { setSelectedPossession(item); setShowModal(true); }}>Modifier</Button>
                      <Button onClick={() => handleClose(item.libelle)}>Clôturer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Modifier Possession</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group>
                    <Form.Label>Libelle</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedPossession?.libelle || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, libelle: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Valeur</Form.Label>
                    <Form.Control
                      type="number"
                      value={selectedPossession?.valeur || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, valeur: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Date Début</Form.Label>
                    <Form.Control
                      type="date"
                      value={selectedPossession?.dateDebut || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, dateDebut: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Date Fin</Form.Label>
                    <DatePicker selected={newDateFin} onChange={date => setNewDateFin(date)} />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Taux d'Amortissement</Form.Label>
                    <Form.Control
                      type="number"
                      value={selectedPossession?.tauxAmortissement || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, tauxAmortissement: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Valeur Constante</Form.Label>
                    <Form.Control
                      type="number"
                      value={selectedPossession?.valeurConstante || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, valeurConstante: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Jour</Form.Label>
                    <Form.Control
                      type="number"
                      value={selectedPossession?.jour || ''}
                      onChange={e => setSelectedPossession(prev => ({ ...prev, jour: e.target.value }))}
                    />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Fermer</Button>
                <Button variant="primary" onClick={handleModify}>Sauvegarder</Button>
              </Modal.Footer>
            </Modal>
          </div>
        } />

        <Route path="/possession/create" element={
          <div>
            <h1>Ajouter Nouvelle Possession</h1>
            <Form>
              <Form.Group>
                <Form.Label>Libelle</Form.Label>
                <Form.Control type="text" placeholder="Libelle" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Valeur</Form.Label>
                <Form.Control type="number" placeholder="Valeur" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Date Début</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Date Fin</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Taux d'Amortissement</Form.Label>
                <Form.Control type="number" placeholder="Taux d'Amortissement" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Valeur Constante</Form.Label>
                <Form.Control type="number" placeholder="Valeur Constante" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Jour</Form.Label>
                <Form.Control type="number" placeholder="Jour" />
              </Form.Group>
              <Button variant="primary" type="submit">Ajouter</Button>
            </Form>
          </div>
        } />

  
      </Routes>
    </Router>
  );
}

export default App;
