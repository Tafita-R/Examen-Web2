import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button, Table, Navbar, Nav } from 'react-bootstrap';
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
        updateChart(json.possessions, startDate, endDate); // Update chart data
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
  
  const calculerValeurPatrimoine = () => {
    const dateActuelle = moment(endDate);
    let totalValeur = 0;

    const possessionsAvecValeurActuelle = possession.map(item => {
      const valeurActuelle = calculerValeurActuelle(item, dateActuelle);
      totalValeur += valeurActuelle;
      return { ...item, valeurActuelle };
    });

    setPossession(possessionsAvecValeurActuelle);
    setPatrimoineValeur(totalValeur);
    updateChart(possessionsAvecValeurActuelle, startDate, endDate); // Update chart with current data
  };

  return (
    <Router>
      <div className="container">
        <Navbar bg="light" expand="lg">
          <Navbar.Brand as={Link} to="/">Home</Navbar.Brand>
          <Nav className="mr-auto">
            <Nav.Link as={Link} to="/tableau">Tableau</Nav.Link>
            <Nav.Link as={Link} to="/graphique">Graphique</Nav.Link>
          </Nav>
        </Navbar>

        <div className="main-content">
          <Routes>
            <Route path="/tableau" element={
              <div className="table-container">
                <Table striped="columns">
                  <thead>
                    <tr>
                      <th>Libellé</th>
                      <th>Valeur Initiale</th>
                      <th>Date Fin</th>
                      <th>Amortissement</th>
                      <th>Valeur Actuelle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {possession.length > 0 ? (
                      possession.map((item, index) => (
                        <tr key={index}>
                          <td>{item.libelle}</td>
                          <td>{item.valeur}</td>
                          <td>{item.dateFin ? moment(item.dateFin).format('YYYY-MM-DD') : "N/A"}</td>
                          <td>{item.valeurActuelle ? item.valeurActuelle.toFixed(2) : "0"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">Aucune donnée disponible</td>
                      </tr>
                    )}
                  </tbody>
                </Table>

                <div className="mt-3">
                  <label className="ml-3">Date Fin</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="control ml-2"
                  />
                  <Button onClick={calculerValeurPatrimoine} className="ml-2">
                    Valider
                  </Button>
                </div>

                <div className="mt-3">
                  <h3>Valeur du Patrimoine: {patrimoineValeur.toFixed(2)} Ar</h3>
                </div>
              </div>
            } />
            <Route path="/graphique" element={
              <div className="chart-container">
                <h3>Graphique de Valeur des Possessions</h3>
                <div className="mt-3">
                  <label className="ml-3">Date Fin</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => {
                      setEndDate(date);
                      updateChart(possession, startDate, date);
                    }}
                    dateFormat="yyyy-MM-dd"
                    className="control ml-2"
                  />
                </div>
                <Line data={chartData} />
              </div>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;