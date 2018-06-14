import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import registerServiceWorker from './registerServiceWorker';

import AppHome from './components/AppHome.jsx';
ReactDOM.render(
  <Router>
    <AppHome />
  </Router>,
  document.getElementById('root') //eslint-disable-line
);

registerServiceWorker();