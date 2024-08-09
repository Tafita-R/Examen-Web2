import { useEffect, useState } from "react";
import "./index.css";
import { Button, Table } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";

function App() {
  const [possession, setPossession] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [patrimoineValeur, setPatrimoineValeur] = useState(0);

  useEffect(() => {
    const doFetch = async () => {
      const response = await fetch("http://localhost:5000/Possession");
      const json = await response.json();
      setPossession(json);
    };
    doFetch();
  }, []);

  const calculerValeurActuelle = (poss, dateActuelle) => {
    const dateDebut = moment(poss.dateDebut);
    const dateFin = poss.dateFin ? moment(poss.dateFin) : dateActuelle;
    const moisUtilises = dateActuelle.diff(dateDebut, 'months', true);

    let valeurActuelle = poss.valeur;

    if (poss.tauxAmortissement && dateDebut.isBefore(dateActuelle)) {
      const amortissement = parseFloat(poss.tauxAmortissement) / 100;
      const dureeUtilisee = Math.min(dateFin.diff(dateDebut, 'years', true), dateActuelle.diff(dateDebut, 'years', true));
      valeurActuelle = poss.valeur - (amortissement * dureeUtilisee * poss.valeur);
    } else if (poss.valeurConstante && poss.jour) {
      const moisUtilises = Math.min(dateFin.diff(dateDebut, 'months', true), dateActuelle.diff(dateDebut, 'months', true));
      valeurActuelle = poss.valeurConstante * moisUtilises;
    }

    return valeurActuelle < 0 ? 0 : valeurActuelle;
  };

  const calculerValeurPatrimoine = () => {
    const dateActuelle = moment(selectedEndDate);
    let totalValeur = 0;

    const possessionsAvecValeurActuelle = possession.map(poss => {
      const valeurActuelle = calculerValeurActuelle(poss, dateActuelle);
      totalValeur += valeurActuelle;
      return { ...poss, valeurActuelle };
    });

    setPossession(possessionsAvecValeurActuelle);
    setPatrimoineValeur(totalValeur);
  };

  return (
    <div className="container">
      <Table striped="columns">
        <thead>
          <tr>
            <th>Libelle</th>
            <th>Valeur initiale</th>
            <th>Date Debut</th>
            <th>Date Fin</th>
            <th>Taux d'Amortissement</th>
            <th>Valeur Constante</th>
            <th>Valeur Actuelle</th>
          </tr>
        </thead>
        <tbody>
          {possession.map((poss, index) => (
            <tr key={index}>
              <td>{poss.libelle}</td>
              <td>{poss.valeur}</td>
              <td>{moment(poss.dateDebut).format('YYYY-MM-DD')}</td>
              <td>{poss.dateFin ? moment(poss.dateFin).format('YYYY-MM-DD') : 'N/A'}</td>
              <td>{poss.tauxAmortissement ? `${poss.tauxAmortissement}%` : 'N/A'}</td>
              <td>{poss.valeurConstante ? `${poss.valeurConstante}` : 'N/A'}</td>
              <td>{poss.valeurActuelle?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="mt-3">
        <label>Date de début :</label>
        <DatePicker
          selected={selectedStartDate}
          onChange={(date) => setSelectedStartDate(date)}
          dateFormat="yyyy-MM-dd"
          className="control"
        />

        <label>Date de fin :</label>
        <DatePicker
          selected={selectedEndDate}
          onChange={(date) => setSelectedEndDate(date)}
          dateFormat="yyyy-MM-dd"
          className="control"
        />

        <Button onClick={calculerValeurPatrimoine} className="ml-2">
          Valider
        </Button>
      </div>

      <div className="mt-3">
        <h3>Valeur du Patrimoine: {patrimoineValeur.toFixed(2)} Ar</h3>
      </div>
    </div>
  );
}

export default App;
